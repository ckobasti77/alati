export type SocialImage = {
  url: string;
};

export type SocialPayload = {
  name: string;
  opis?: string;
  prodajnaCena: number;
  currency?: string;
  images: SocialImage[];
};

/**
 * Meta/Instagram/Facebook deljenje je ukinuto. Ostavljen je stub da bi postojece
 * import putanje ostale validne bez realnih poziva ka Graph API-ju.
 */
export const shareProductOnMeta = async (_payload: SocialPayload) => {
  return;
};
