import Link from "next/link";
import { ActionMenu } from "@/components/ui/action-menu";
import { Money } from "@/components/ui/money";
import type { Product } from "@/types/order";
import { ProductImage, ProductTags } from "./ProductCard";
import { productHref, type ProductListApi } from "./productListApi";

/** Telefon, prikaz „Lista“: gusti redovi (sličica 56), ceo red je link, ⋯ iznad njega. */
export function ProductRows({ products, api }: { products: Product[]; api: ProductListApi }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
      {products.map((product) => {
        const name = api.getName(product);
        const purchase = api.getPurchase(product);
        return (
          <li key={product._id} data-flip-id={product._id} className="relative flex items-center gap-3 px-3 py-2 active:bg-surface-2">
            <span className="size-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
              <ProductImage url={api.getImageUrl(product)} />
            </span>
            <div className="min-w-0 flex-1">
              <Link href={productHref(product)} className="line-clamp-2 text-[15px] leading-5 font-medium text-text outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring">
                {name}
              </Link>
              <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-text-muted">
                <Money value={api.getPrice(product)} className="text-sm font-semibold text-text" />
                <span>
                  nab. <Money value={purchase.price} />
                </span>
                <span className="num">Prodato {api.getSold(product)}</span>
                <ProductTags product={product} />
              </p>
            </div>
            <ActionMenu items={api.menuFor(product)} label={`Akcije za ${name}`} triggerClassName="relative z-(--z-raised) -mr-1 text-text-muted" />
          </li>
        );
      })}
    </ul>
  );
}
