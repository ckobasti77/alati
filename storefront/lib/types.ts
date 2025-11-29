export type PublicImage = {
  storageId: string;
  isMain: boolean;
  fileName?: string;
  contentType?: string;
  publishFb?: boolean;
  publishIg?: boolean;
  uploadedAt?: number;
  url?: string | null;
};

export type PublicVariant = {
  id: string;
  label: string;
  prodajnaCena: number;
  isDefault: boolean;
  opis?: string;
  images?: PublicImage[];
};

export type PublicCategory = {
  id: string;
  name: string;
  slug?: string;
  iconUrl?: string | null;
  iconStorageId?: string;
};

export type PublicProduct = {
  id: string;
  name: string;
  kpName?: string;
  fbName?: string;
  prodajnaCena: number;
  opis?: string;
  opisKp?: string;
  opisFbInsta?: string;
  images?: PublicImage[];
  variants?: PublicVariant[];
  publishKp?: boolean;
  publishFb?: boolean;
  publishIg?: boolean;
  publishFbProfile?: boolean;
  publishMarketplace?: boolean;
  pickupAvailable?: boolean;
  categoryIds?: string[];
  categories?: PublicCategory[];
  createdAt: number;
  updatedAt: number;
};
