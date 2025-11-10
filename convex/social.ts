const graphVersion = process.env.META_GRAPH_VERSION ?? "v21.0";
const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const facebookToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID;
const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? facebookToken;

type SocialImage = {
  url: string;
};

type SocialPayload = {
  name: string;
  opis?: string;
  prodajnaCena: number;
  currency?: string;
  images: SocialImage[];
};

const graphBaseUrl = `https://graph.facebook.com/${graphVersion}`;
const DEFAULT_CURRENCY = "RSD";

const formatCaption = (payload: SocialPayload) => {
  const currency = payload.currency ?? DEFAULT_CURRENCY;
  const parts = [
    payload.name,
    payload.opis?.trim(),
    `Cena: ${Intl.NumberFormat("sr-RS", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(payload.prodajnaCena)}`,
  ].filter(Boolean);
  return parts.join("\n\n");
};

const buildParams = (entries: Record<string, string>) => {
  const params = new URLSearchParams();
  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value);
    }
  });
  return params;
};

const graphPost = async (path: string, params: URLSearchParams) => {
  const response = await fetch(`${graphBaseUrl}/${path}`, {
    method: "POST",
    body: params,
  });
  const json = (await response.json()) as { id?: string; error?: { message: string; code: number } };
  if (!response.ok || json.error) {
    const errorInfo = json.error ? `${json.error.message} (code ${json.error.code})` : response.statusText;
    throw new Error(`Meta request to ${path} failed: ${errorInfo}`);
  }
  return json;
};

const postToFacebook = async (payload: SocialPayload) => {
  if (!facebookPageId || !facebookToken) {
    return;
  }
  if (!payload.images.length) {
    return;
  }
  const caption = formatCaption(payload);
  const limitedImages = payload.images.slice(0, 10);

  const unpublishedMediaIds = await Promise.all(
    limitedImages.map(async (image) => {
      const params = buildParams({
        url: image.url,
        published: "false",
        access_token: facebookToken,
      });
      const result = await graphPost(`${facebookPageId}/photos`, params);
      return result.id;
    }),
  );

  const feedParams = buildParams({
    message: caption,
    access_token: facebookToken,
  });
  unpublishedMediaIds.forEach((id, index) => {
    if (id) {
      feedParams.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: id }));
    }
  });
  await graphPost(`${facebookPageId}/feed`, feedParams);
};

const postToInstagram = async (payload: SocialPayload) => {
  if (!instagramBusinessId || !instagramToken) {
    return;
  }
  if (!payload.images.length) {
    return;
  }
  const caption = formatCaption(payload);
  const limitedImages = payload.images.slice(0, 10);

  if (limitedImages.length === 1) {
    const params = buildParams({
      image_url: limitedImages[0].url,
      caption,
      access_token: instagramToken,
    });
    const creation = await graphPost(`${instagramBusinessId}/media`, params);
    await graphPost(
      `${instagramBusinessId}/media_publish`,
      buildParams({ creation_id: creation.id ?? "", access_token: instagramToken }),
    );
    return;
  }

  const childIds: string[] = [];
  for (const image of limitedImages) {
    const params = buildParams({
      image_url: image.url,
      is_carousel_item: "true",
      access_token: instagramToken,
    });
    const child = await graphPost(`${instagramBusinessId}/media`, params);
    if (child.id) {
      childIds.push(child.id);
    }
  }

  if (!childIds.length) {
    return;
  }

  const carousel = await graphPost(
    `${instagramBusinessId}/media`,
    buildParams({
      caption,
      children: childIds.join(","),
      media_type: "CAROUSEL",
      access_token: instagramToken,
    }),
  );
  await graphPost(
    `${instagramBusinessId}/media_publish`,
    buildParams({
      creation_id: carousel.id ?? "",
      access_token: instagramToken,
    }),
  );
};

export const shareProductOnMeta = async (payload: SocialPayload) => {
  if (!payload.images.length) {
    return;
  }
  await Promise.allSettled([postToFacebook(payload), postToInstagram(payload)]);
};
