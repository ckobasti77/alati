import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { internal } from "./_generated/api";

const GRAPH_VERSION = "v21.0";
const FACEBOOK_USER_KEY = "facebook:user_access_token";
const FACEBOOK_PAGE_KEY = "facebook:page_access_token";

type Platform = "facebook" | "instagram";

type ProductImage = {
  url?: string | null;
  isMain: boolean;
  publishFb?: boolean;
  publishIg?: boolean;
  uploadedAt?: number;
};

type AdImage = {
  url?: string | null;
  uploadedAt?: number;
};

type ProductForPosting = {
  _id: Id<"products">;
  userId?: Id<"users">;
  name: string;
  opis?: string | null;
  opisFbInsta?: string | null;
  opisKp?: string | null;
  images?: ProductImage[];
  adImage?: AdImage | null;
};

type StoredFacebookTokens = {
  userAccessToken: string | null;
  userTokenExpiresAt?: number | null;
  pageAccessToken: string | null;
  pageTokenExpiresAt?: number | null;
  instagramBusinessId?: string | null;
  pageId?: string | null;
};

type GraphErrorResponse = {
  error?: { message?: string; code?: number; type?: string };
};

const platformSchema = v.union(v.literal("facebook"), v.literal("instagram"));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseScheduleInput(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Neispravan datum zakazivanja.");
  }
  if (value <= Date.now()) {
    throw new Error("Vreme za zakazivanje mora biti u buducnosti.");
  }
  return value;
}

function sortImages(images: ProductImage[] = [], platform: Platform) {
  const withUrl = images
    .map((image, index) => ({ ...image, index }))
    .filter((image) => {
      if (!image.url) return false;
      if (platform === "facebook") {
        return image.publishFb !== false;
      }
      return image.publishIg !== false;
    });
  return withUrl
    .sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.index - b.index;
    })
    .map(({ index, ...rest }) => rest);
}

function mergeSocialImages(product: ProductForPosting) {
  const baseImages = (product.images as ProductImage[] | undefined) ?? [];
  const list: ProductImage[] = [];
  if (product.adImage?.url) {
    list.push({
      url: product.adImage.url,
      isMain: true,
      publishFb: true,
      publishIg: true,
      uploadedAt: product.adImage.uploadedAt,
    });
  }
  return [...list, ...baseImages];
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
  throw new Error("Media container nije spreman za objavu.");
}

async function fetchPageAccessToken(pageId: string, userToken: string) {
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

async function getPageAccess(tokens: StoredFacebookTokens) {
  const pageId = tokens.pageId ?? process.env.FB_PAGE_ID;
  if (!pageId) {
    throw new Error("FB_PAGE_ID nije definisan.");
  }
  let pageAccessToken = tokens.pageAccessToken ?? null;
  let instagramBusinessId = tokens.instagramBusinessId ?? null;

  if (!pageAccessToken || !instagramBusinessId) {
    if (!tokens.userAccessToken) {
      throw new Error("Nedostaje Facebook user token. Prijavi se ponovo.");
    }
    const refreshed = await fetchPageAccessToken(pageId, tokens.userAccessToken);
    pageAccessToken = pageAccessToken ?? refreshed.pageAccessToken;
    instagramBusinessId = instagramBusinessId ?? refreshed.instagramBusinessId ?? null;
  }

  if (!pageAccessToken) {
    throw new Error("Nije moguce dobiti page access token.");
  }

  return { pageId, pageAccessToken, instagramBusinessId };
}

async function publishToFacebook(
  product: ProductForPosting,
  images: ProductImage[],
  access: { pageId: string; pageAccessToken: string },
) {
  const caption = resolveCaption(product);
  const selectedImages = images.slice(0, 10);
  if (selectedImages.length === 0) {
    throw new Error("Proizvod nema dostupne slike za objavu.");
  }

  const attachedMediaIds: string[] = [];
  for (const image of selectedImages) {
    const params = new URLSearchParams({
      access_token: access.pageAccessToken,
      published: "false",
      url: image.url as string,
    });
    const uploadUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${access.pageId}/photos`;
    const data = await fetchJson<{ id: string }>(uploadUrl, {
      method: "POST",
      body: params,
    });
    attachedMediaIds.push(data.id);
  }

  const feedParams = new URLSearchParams({
    access_token: access.pageAccessToken,
    message: caption,
  });

  attachedMediaIds.forEach((id, index) => {
    feedParams.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: id }));
  });

  const feedUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${access.pageId}/feed`;
  return await fetchJson<{ id: string }>(feedUrl, { method: "POST", body: feedParams });
}

async function publishToInstagram(
  product: ProductForPosting,
  images: ProductImage[],
  access: { instagramBusinessId?: string | null; pageAccessToken: string },
) {
  if (!access.instagramBusinessId) {
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
      access_token: access.pageAccessToken,
      image_url: image.url as string,
    });
    if (isCarousel) {
      params.append("is_carousel_item", "true");
    } else if (caption) {
      params.append("caption", caption);
    }

    const uploadUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${access.instagramBusinessId}/media`;
    const data = await fetchJson<{ id: string }>(uploadUrl, { method: "POST", body: params });
    childIds.push(data.id);
  }

  let creationId = childIds[0];

  if (isCarousel) {
    const carouselParams = new URLSearchParams({
      access_token: access.pageAccessToken,
      media_type: "CAROUSEL",
      children: childIds.join(","),
    });
    if (caption) {
      carouselParams.append("caption", caption);
    }
    const carouselUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${access.instagramBusinessId}/media`;
    const carousel = await fetchJson<{ id: string }>(carouselUrl, { method: "POST", body: carouselParams });
    creationId = carousel.id;
  }

  await waitForMediaReady(creationId, access.pageAccessToken);

  const publishParams = new URLSearchParams({
    access_token: access.pageAccessToken,
    creation_id: creationId,
  });
  const publishUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${access.instagramBusinessId}/media_publish`;
  return await fetchJson<{ id: string }>(publishUrl, { method: "POST", body: publishParams });
}

export const listScheduled = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);
    const items = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_user_scheduledAt", (q) => q.eq("userId", user._id))
      .collect();
    const active = items.filter((item) => item.status !== "published");
    active.sort((a, b) => a.scheduledAt - b.scheduledAt);

    const results = await Promise.all(
      active.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const productName = product?.kpName ?? product?.name ?? "Nepoznat proizvod";
        return {
          _id: item._id,
          productId: item.productId,
          productName,
          platform: item.platform,
          scheduledAt: item.scheduledAt,
          status: item.status,
          error: item.error ?? undefined,
        };
      }),
    );

    return results;
  },
});

export const schedule = mutation({
  args: {
    token: v.string(),
    productId: v.id("products"),
    platform: platformSchema,
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);
    const scheduledAt = parseScheduleInput(args.scheduledAt);
    const now = Date.now();

    const id = await ctx.db.insert("scheduledPosts", {
      userId: user._id,
      productId: args.productId,
      platform: args.platform,
      scheduledAt,
      status: "scheduled",
      createdAt: now,
      attempts: 0,
    });

    const scheduledJobId = await ctx.scheduler.runAt(scheduledAt, internal.socialScheduler.publishScheduled, { id });
    await ctx.db.patch(id, { scheduledJobId });
    return { id };
  },
});

export const removeScheduled = mutation({
  args: { token: v.string(), id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);
    const post = await ctx.db.get(args.id);
    if (!post || post.userId !== user._id) {
      throw new Error("Zakazana objava nije pronadjena.");
    }
    if (post.status === "processing") {
      throw new Error("Objava je vec u toku.");
    }
    if (post.scheduledJobId) {
      try {
        await ctx.scheduler.cancel(post.scheduledJobId);
      } catch (error) {
        console.warn("Neuspesno otkazivanje scheduler-a", error);
      }
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const claimScheduled = internalMutation({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post || post.status !== "scheduled") {
      return null;
    }
    await ctx.db.patch(args.id, {
      status: "processing",
      attempts: (post.attempts ?? 0) + 1,
      lastAttemptAt: Date.now(),
      error: undefined,
    });
    return post;
  },
});

export const markPublished = internalMutation({
  args: { id: v.id("scheduledPosts"), postId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: Date.now(),
      postId: args.postId,
      error: undefined,
    });
  },
});

export const markFailed = internalMutation({
  args: { id: v.id("scheduledPosts"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error,
    });
  },
});

export const getFacebookTokensInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userSecret = await ctx.db
      .query("secrets")
      .withIndex("by_key", (q) => q.eq("key", FACEBOOK_USER_KEY))
      .unique();
    const pageSecret = await ctx.db
      .query("secrets")
      .withIndex("by_key", (q) => q.eq("key", FACEBOOK_PAGE_KEY))
      .unique();

    return {
      userAccessToken: userSecret?.value ?? null,
      userTokenExpiresAt: userSecret?.expiresAt ?? null,
      pageAccessToken: pageSecret?.value ?? null,
      pageTokenExpiresAt: pageSecret?.expiresAt ?? null,
      instagramBusinessId:
        pageSecret?.meta?.instagramBusinessId ?? userSecret?.meta?.instagramBusinessId ?? null,
      pageId: pageSecret?.meta?.pageId ?? userSecret?.meta?.pageId ?? null,
      updatedAt: Math.max(userSecret?.updatedAt ?? 0, pageSecret?.updatedAt ?? 0) || null,
    } as StoredFacebookTokens & { updatedAt?: number | null };
  },
});

export const getProductForPosting = internalQuery({
  args: { id: v.id("products"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== args.userId) {
      return null;
    }

    const images = await Promise.all(
      (product.images ?? []).map(async (image) => ({
        ...image,
        url: await ctx.storage.getUrl(image.storageId),
      })),
    );
    const adImage = product.adImage
      ? {
          ...product.adImage,
          url: await ctx.storage.getUrl(product.adImage.storageId),
        }
      : undefined;

    return { ...product, images, adImage } as Doc<"products"> & {
      images?: ProductImage[];
      adImage?: AdImage | null;
    };
  },
});

export const publishScheduled = internalAction({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.runMutation(internal.socialScheduler.claimScheduled, { id: args.id });
    if (!post) return;

    try {
      const product = await ctx.runQuery(internal.socialScheduler.getProductForPosting, {
        id: post.productId,
        userId: post.userId,
      });
      if (!product) {
        throw new Error("Proizvod nije pronadjen.");
      }

      const tokens = await ctx.runQuery(internal.socialScheduler.getFacebookTokensInternal, {});
      const access = await getPageAccess(tokens);
      const images = sortImages(mergeSocialImages(product as ProductForPosting), post.platform);

      const result =
        post.platform === "facebook"
          ? await publishToFacebook(product as ProductForPosting, images, access)
          : await publishToInstagram(product as ProductForPosting, images, {
              instagramBusinessId: access.instagramBusinessId,
              pageAccessToken: access.pageAccessToken,
            });

      await ctx.runMutation(internal.socialScheduler.markPublished, { id: post._id, postId: result.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Greska pri objavi.";
      await ctx.runMutation(internal.socialScheduler.markFailed, { id: post._id, error: message });
    }
  },
});
