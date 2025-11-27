import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const GRAPH_VERSION = "v21.0";
const FACEBOOK_USER_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FB_PAGE_ID;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = new ConvexHttpClient(requireEnv(CONVEX_URL, "NEXT_PUBLIC_CONVEX_URL"));

type Platform = "facebook" | "instagram";

type ProductImage = {
  url?: string | null;
  isMain: boolean;
  uploadedAt?: number;
};

type ProductForPosting = {
  _id: Id<"products">;
  name: string;
  opis?: string | null;
  opisFbInsta?: string | null;
  opisKp?: string | null;
  images?: ProductImage[];
};

type GraphErrorResponse = {
  error?: { message?: string; code?: number; type?: string };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonResponse = (data: unknown, init?: number) => NextResponse.json(data, { status: init ?? 200 });

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Env var ${name} nije definisana.`);
  }
  return value;
}

function sortImages(images: ProductImage[] = []) {
  const withUrl = images
    .map((image, index) => ({ ...image, index }))
    .filter((image) => image.url);
  return withUrl
    .sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.index - b.index;
    })
    .map(({ index, ...rest }) => rest);
}

function resolveCaption(product: ProductForPosting) {
  return product.opisFbInsta || product.opis || product.opisKp || product.name;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T & GraphErrorResponse;
  if (!response.ok || data?.error) {
    const message = data?.error?.message ?? `Graph request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

async function getPageAccess() {
  const userToken = requireEnv(FACEBOOK_USER_TOKEN, "FACEBOOK_ACCESS_TOKEN");
  const pageId = requireEnv(FACEBOOK_PAGE_ID, "FB_PAGE_ID");
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=access_token,instagram_business_account&access_token=${userToken}`;
  const data = await fetchJson<{ access_token: string; instagram_business_account?: { id: string } }>(url);
  if (!data.access_token) {
    throw new Error("Nije moguce dobiti page access token.");
  }
  return {
    pageId,
    pageAccessToken: data.access_token,
    instagramBusinessId: data.instagram_business_account?.id,
  };
}

async function publishToFacebook(
  product: ProductForPosting,
  images: ProductImage[],
  options: { scheduledAt?: number },
) {
  const { pageId, pageAccessToken } = await getPageAccess();
  const caption = resolveCaption(product);
  const selectedImages = images.slice(0, 10);
  if (selectedImages.length === 0) {
    throw new Error("Proizvod nema dostupne slike za objavu.");
  }

  const attachedMediaIds: string[] = [];
  for (const image of selectedImages) {
    const params = new URLSearchParams({
      access_token: pageAccessToken,
      published: "false",
      url: image.url as string,
    });
    const uploadUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`;
    const data = await fetchJson<{ id: string }>(uploadUrl, {
      method: "POST",
      body: params,
    });
    attachedMediaIds.push(data.id);
  }

  const feedParams = new URLSearchParams({
    access_token: pageAccessToken,
    message: caption,
  });

  attachedMediaIds.forEach((id, index) => {
    feedParams.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: id }));
  });

  if (options.scheduledAt) {
    feedParams.append("published", "false");
    feedParams.append("scheduled_publish_time", `${options.scheduledAt}`);
  }

  const feedUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`;
  return await fetchJson<{ id: string }>(feedUrl, { method: "POST", body: feedParams });
}

async function publishToInstagram(
  product: ProductForPosting,
  images: ProductImage[],
  options: { scheduledAt?: number },
) {
  const { instagramBusinessId, pageAccessToken } = await getPageAccess();
  if (!instagramBusinessId) {
    throw new Error("Instagram Business nalog nije povezan sa FB stranicom.");
  }

  const caption = resolveCaption(product);
  const selectedImages = images.slice(0, 10);
  if (selectedImages.length === 0) {
    throw new Error("Proizvod nema dostupne slike za objavu.");
  }

  const childIds: string[] = [];
  const isCarousel = selectedImages.length > 1;

  for (const image of selectedImages) {
    const params = new URLSearchParams({
      access_token: pageAccessToken,
      image_url: image.url as string,
    });
    if (isCarousel) {
      params.append("is_carousel_item", "true");
    } else if (caption) {
      params.append("caption", caption);
    }

    const uploadUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${instagramBusinessId}/media`;
    const data = await fetchJson<{ id: string }>(uploadUrl, { method: "POST", body: params });
    childIds.push(data.id);
  }

  let creationId = childIds[0];

  if (isCarousel) {
    const carouselParams = new URLSearchParams({
      access_token: pageAccessToken,
      media_type: "CAROUSEL",
      children: childIds.join(","),
    });
    if (caption) {
      carouselParams.append("caption", caption);
    }
    const carouselUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${instagramBusinessId}/media`;
    const carousel = await fetchJson<{ id: string }>(carouselUrl, { method: "POST", body: carouselParams });
    creationId = carousel.id;
  }

  // IG često traži da media container bude u statusu FINISHED pre publish-a
  await waitForMediaReady(creationId, pageAccessToken);

  const publishParams = new URLSearchParams({
    access_token: pageAccessToken,
    creation_id: creationId,
  });
  if (options.scheduledAt) {
    publishParams.append("publish_time", `${options.scheduledAt}`);
  }
  const publishUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${instagramBusinessId}/media_publish`;
  return await fetchJson<{ id: string }>(publishUrl, { method: "POST", body: publishParams });
}

async function waitForMediaReady(creationId: string, accessToken: string) {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${creationId}?fields=status_code,status&access_token=${accessToken}`;
    const data = await fetchJson<{ status_code?: string; status?: string }>(statusUrl);
    const code = data.status_code ?? data.status;
    if (code === "FINISHED") return;
    if (code === "ERROR") {
      throw new Error("Instagram media container je u ERROR statusu.");
    }
    await sleep(700);
  }
  throw new Error("Media ID is not available (container nije spreman).");
}

function parseSchedule(value?: string | null) {
  if (!value) return undefined;
  const ts = Number(new Date(value));
  if (!Number.isFinite(ts) || ts <= Date.now()) {
    throw new Error("Vreme za zakazivanje mora biti u buducnosti.");
  }
  return Math.floor(ts / 1000);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      platform?: Platform;
      productId?: string;
      token?: string;
      scheduledAt?: string | null;
    };

    if (!body.platform || !body.productId || !body.token) {
      return jsonResponse({ error: "platform, productId i token su obavezni." }, 400);
    }

    const session = await convex.query(api.auth.session, { token: body.token });
    if (!session || session.user.role !== "admin") {
      return jsonResponse({ error: "Neautorizovan pristup." }, 401);
    }

    const product = await convex.query(api.products.get, {
      id: body.productId as Id<"products">,
      token: body.token,
    });
    if (!product) {
      return jsonResponse({ error: "Proizvod nije pronadjen." }, 404);
    }

    const images = sortImages(product.images as ProductImage[] | undefined);
    const scheduledAt = parseSchedule(body.scheduledAt);

    if (body.platform === "facebook") {
      const result = await publishToFacebook(product as ProductForPosting, images, { scheduledAt });
      return jsonResponse({ ok: true, platform: "facebook", id: result.id });
    }

    if (body.platform === "instagram") {
      const result = await publishToInstagram(product as ProductForPosting, images, { scheduledAt });
      return jsonResponse({ ok: true, platform: "instagram", id: result.id });
    }

    return jsonResponse({ error: "Nepoznata platforma." }, 400);
  } catch (error: any) {
    console.error("Social publish failed", error);
    return jsonResponse({ error: error?.message ?? "Greska pri objavi." }, 500);
  }
}
