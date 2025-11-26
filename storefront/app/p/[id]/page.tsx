"use client";

import { useMemo, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MoveRight, Shield, Sparkles, Truck } from "lucide-react";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { formatCurrency } from "../../../lib/format";
import type { PublicProduct } from "../../../lib/types";
import { useConvexQuery } from "../../../lib/convex";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const product = useConvexQuery<PublicProduct | null>("products:getPublic", { id: productId });
  const isLoading = product === undefined;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState({
    ime: "",
    prezime: "",
    adresa: "",
    postanski: "",
    grad: "",
    telefon: "",
  });

  const variants = useMemo(() => product?.variants ?? [], [product]);
  const resolvedVariantId = useMemo(() => {
    if (!product || variants.length === 0) return null;
    if (selectedVariantId) return selectedVariantId;
    const defaultVar = variants.find((v) => v.isDefault) ?? variants[0];
    return defaultVar.id;
  }, [product, selectedVariantId, variants]);

  const selectedVariant = variants.find((v) => v.id === resolvedVariantId) || null;
  const displayPrice = selectedVariant?.prodajnaCena ?? product?.prodajnaCena ?? 0;
  const gallery = useMemo(() => {
    if (!product) return [];
    if (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) {
      return selectedVariant.images;
    }
    return product.images ?? [];
  }, [product, selectedVariant]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    alert(
      `Hvala! Primili smo podatke:\n${orderData.ime} ${orderData.prezime}, ${orderData.adresa}, ${orderData.postanski} ${orderData.grad}, tel: ${orderData.telefon}\nKontaktiraćemo vas za potvrdu.`,
    );
  };

  if (isLoading) {
    return (
      <div className="stack">
        <div className="topbar">
          <button className="button" onClick={() => router.push("/")}>
            <ArrowLeft size={16} />
            Nazad
          </button>
          <ThemeToggle />
        </div>
        <div className="loading" style={{ marginTop: 12 }}>
          <Loader2 className="animate-spin" size={18} />
          Učitavanje proizvoda...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="stack">
        <div className="topbar">
          <button className="button" onClick={() => router.push("/")}>
            <ArrowLeft size={16} />
            Nazad
          </button>
          <ThemeToggle />
        </div>
        <div className="empty" style={{ marginTop: 12 }}>
          Proizvod nije pronađen.
        </div>
      </div>
    );
  }

  return (
    <div className="detail-shell">
      <div className="topbar">
        <button className="button" onClick={() => router.push("/")}>
          <ArrowLeft size={16} />
          Nazad
        </button>
        <ThemeToggle />
      </div>

      <div className="detail-grid">
        <div className="glass hero-card">
          <p className="eyebrow">Proizvod</p>
          <h2 className="detail-title">{product.kpName ?? product.name}</h2>
          <div className="detail-actions">
            <div className="pill strong">{formatCurrency(displayPrice)}</div>
            <button className="button primary" onClick={() => document.getElementById("narudzbina-form")?.scrollIntoView({ behavior: "smooth" })}>
              Naruči <MoveRight size={16} />
            </button>
          </div>
          {product.pickupAvailable ? (
            <label className="pickup-indicator">
              <input type="checkbox" checked readOnly aria-label="Lično preuzimanje dostupno" />
              Lično preuzimanje dostupno
            </label>
          ) : null}

          {variants.length > 0 && (
            <div className="variant-switch">
              {variants.slice(0, 10).map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={`variant-pill ${variant.id === resolvedVariantId ? "active" : ""}`}
                  onClick={() => setSelectedVariantId(variant.id)}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          )}

          <div className="gallery">
            {gallery.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gallery.find((img) => img.isMain)?.url ?? gallery[0]?.url ?? ""}
                  alt={product.kpName ?? product.name}
                  className="hero-img"
                />
                <div className="thumb-row">
                  {gallery.slice(0, 5).map((image) =>
                    image.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={image.storageId} src={image.url} alt={product.kpName ?? product.name} className="thumb" />
                    ) : null,
                  )}
                </div>
              </>
            ) : (
              <div className="product-card__placeholder" style={{ height: 260, borderRadius: 16, border: "1px dashed var(--border)" }}>
                Bez slike
              </div>
            )}
          </div>
        </div>

        <div className="glass hero-card">
          <div className="detail-top">
            <div>
              <p className="eyebrow">Opis i detalji</p>
              <h3 className="detail-subtitle">Šta dobijate</h3>
            </div>
            <div className="pill strong">{formatCurrency(displayPrice)}</div>
          </div>
          <p className="muted">{selectedVariant?.opis ?? product.opis ?? product.opisFbInsta ?? product.opisKp ?? "Detalji na upit."}</p>
          <div className="meta-row" style={{ marginTop: 12 }}>
            <span className="badge">
              <Sparkles size={14} />
              Proveren alat
            </span>
            <span className="badge">
              <Truck size={14} />
              Brza isporuka
            </span>
            <span className="badge">
              <Shield size={14} />
              Sigurna kupovina
            </span>
          </div>
          <form id="narudzbina-form" className="order-form" onSubmit={handleSubmit}>
            <p className="eyebrow">Podaci za slanje</p>
            <div className="form-grid">
              <input
                required
                placeholder="Ime"
                value={orderData.ime}
                onChange={(e) => setOrderData({ ...orderData, ime: e.target.value })}
              />
              <input
                required
                placeholder="Prezime"
                value={orderData.prezime}
                onChange={(e) => setOrderData({ ...orderData, prezime: e.target.value })}
              />
              <input
                required
                placeholder="Adresa"
                value={orderData.adresa}
                onChange={(e) => setOrderData({ ...orderData, adresa: e.target.value })}
              />
              <input
                required
                placeholder="Poštanski broj"
                value={orderData.postanski}
                onChange={(e) => setOrderData({ ...orderData, postanski: e.target.value })}
              />
              <input
                required
                placeholder="Grad"
                value={orderData.grad}
                onChange={(e) => setOrderData({ ...orderData, grad: e.target.value })}
              />
              <input
                required
                placeholder="Broj telefona"
                value={orderData.telefon}
                onChange={(e) => setOrderData({ ...orderData, telefon: e.target.value })}
              />
            </div>
            <button type="submit" className="button primary" style={{ width: "100%", justifyContent: "center" }}>
              Pošalji podatke <MoveRight size={16} />
            </button>
          </form>
        </div>
      </div>

      <div className="glass hero-card" style={{ marginTop: 10 }}>
        <div className="detail-top">
          <div>
            <p className="eyebrow">Kako poručiti</p>
            <h3 className="detail-subtitle">Brza kupovina u tri koraka</h3>
          </div>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-index">1</span>
            <div>
              <p className="highlight-title">Izaberi model</p>
              <p className="muted">Pogledaj slike i izaberi varijantu koja ti odgovara.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-index">2</span>
            <div>
              <p className="highlight-title">Pošalji podatke</p>
              <p className="muted">Upiši ime, adresu i telefon da dogovorimo isporuku.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-index">3</span>
            <div>
              <p className="highlight-title">Preuzmi</p>
              <p className="muted">Potvrđujemo dostupnost i šaljemo gde god treba.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
