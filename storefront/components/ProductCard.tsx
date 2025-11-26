import Link from "next/link";
import { MoveRight } from "lucide-react";
import { clampText, formatCurrency } from "../lib/format";
import type { PublicProduct } from "../lib/types";

export function ProductCard({ product }: { product: PublicProduct }) {
  const mainImage = product.images?.find((image) => image.isMain) ?? product.images?.[0];

  return (
    <Link href={`/p/${product.id}`} className="product-card">
      <div className="product-card__image">
        {mainImage?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mainImage.url} alt={product.kpName ?? product.name} loading="lazy" />
        ) : (
          <div className="product-card__placeholder">Bez slike</div>
        )}
        <div className="product-card__glow" />
        <div className="product-card__meta">
          <span className="pill strong">{formatCurrency(product.prodajnaCena)}</span>
          {product.pickupAvailable ? <span className="pill pickup-pill">Lično preuzimanje</span> : null}
        </div>
      </div>
      <div className="product-card__body">
        <h3>{product.kpName ?? product.name}</h3>
        <p className="muted">{clampText(product.opis ?? product.opisFbInsta ?? product.opisKp, 110)}</p>
        <div className="product-card__footer">
          <p className="label">Pogledaj detalje</p>
          <span className="cta ghost">
            Detaljnije <MoveRight size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}
