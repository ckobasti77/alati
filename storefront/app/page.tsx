"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight, Home, Loader2, Search, Shield, Sparkles, Tractor, Truck, Wrench } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import type { PublicCategory, PublicProduct } from "../lib/types";
import { formatCurrency } from "../lib/format";

const highlights = [
  { icon: <Sparkles size={16} />, title: "Top izbor", desc: "Provereni modeli koje kupuju majstori i domaćinstva." },
  { icon: <Truck size={16} />, title: "Brza isporuka", desc: "Šaljemo odmah po dogovoru, na vašu adresu." },
  { icon: <Shield size={16} />, title: "Sigurna kupovina", desc: "Jasne cene, slike i dogovor pre slanja." },
  { icon: <Wrench size={16} />, title: "Saveti uz kupovinu", desc: "Pomažemo da izabereš alat koji ti stvarno treba." },
];

const fallbackCategories = [
  { id: "kuca", label: "Kuća i radionica", icon: <Home size={15} />, keywords: ["alat", "šraf", "šrafc", "busil", "bušil", "čekić"] },
  { id: "vrt", label: "Dvorište i vrt", icon: <Truck size={15} />, keywords: ["trimer", "motor", "pumpa", "prska", "kosa", "vrt", "vrtni"] },
  { id: "struja", label: "Elektrika / baterija", icon: <Sparkles size={15} />, keywords: ["akku", "bater", "elekt", "struj"] },
  { id: "poljo", label: "Poljoprivreda", icon: <Tractor size={15} />, keywords: ["poljo", "kultiv", "pumpa", "prska", "rasprs"] },
];

const slideIntervalMs = 4200;

export default function StorefrontPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [slideIndex, setSlideIndex] = useState(0);

  const products = useQuery("products:listPublic", { search: search.trim() || undefined }) as
    | PublicProduct[]
    | undefined;
  const categories = useQuery("categories:listPublic", {}) as PublicCategory[] | undefined;
  const isLoading = products === undefined;
  const items = products ?? [];
  const categoryOptions = useMemo(() => {
    const apiCategories =
      categories?.map((category) => ({
        id: category.id ?? (category as any)._id,
        label: category.name,
        iconUrl: category.iconUrl ?? null,
        keywords: [] as string[],
      })) ?? [];
    const base = apiCategories.length > 0 ? apiCategories : fallbackCategories;
    return [{ id: "all", label: "Svi proizvodi", iconUrl: null, keywords: [] as string[] }, ...base];
  }, [categories]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return items;
    const entry = categoryOptions.find((c) => c.id === selectedCategory);
    if (!entry) return items;
    const byCategory = items.filter((item) => (item.categoryIds ?? []).includes(selectedCategory));
    if (byCategory.length > 0) return byCategory;
    const keywords = entry.keywords ?? [];
    if (keywords.length === 0) return items;
    const subset = items.filter((item) => {
      const text = `${item.kpName ?? item.name} ${item.opis ?? ""} ${item.opisFbInsta ?? ""} ${item.opisKp ?? ""}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });
    return subset.length > 0 ? subset : items;
  }, [items, selectedCategory, categoryOptions]);

  const slides = useMemo(() => {
    if (items.length === 0) return [];
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(6, shuffled.length));
  }, [items]);

  useEffect(() => {
    setSlideIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const id = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, slideIntervalMs);
    return () => clearInterval(id);
  }, [slides]);

  const currentSlide = slides[slideIndex] ?? slides[0];

  return (
    <div className="page-grid">
      <aside className="category-rail" id="kategorije">
        <p className="eyebrow">Kategorije</p>
        <div className="category-list">
          {categoryOptions.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-chip ${selectedCategory === cat.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.iconUrl} alt={cat.label} className="h-4 w-4 rounded-full object-cover" />
              ) : (
                (cat as any).icon ?? <Sparkles size={15} />
              )}
              {cat.label ?? (cat as any).name}
            </button>
          ))}
        </div>
        <p className="muted small">
          {categories === undefined ? "Učitavanje kategorija..." : "Kategorije dolaze direktno iz admin panela."}
        </p>
      </aside>

      <div className="stack">
        <div className="glass hero">
          <div className="hero__grid">
            <div className="hero__right">
              <p className="eyebrow">Alati Mašine</p>
              <h1 className="hero__title">Spreman alat za kuću, dvorište ili njivu.</h1>
              <p className="hero__subtitle">
                Jasne cene, brza isporuka i realne slike. Odaberi šta ti treba i pošalji podatke za dostavu u par koraka.
              </p>
              <div className="search">
                <Search size={18} className="search__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pretraži katalog..."
                  aria-label="Pretraži proizvode"
                />
              </div>
              <div className="highlight-row">
                {highlights.map((item) => (
                  <div key={item.title} className="highlight-card">
                    <div className="highlight-icon">{item.icon}</div>
                    <div>
                      <p className="highlight-title">{item.title}</p>
                      <p className="muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cta-row">
                <Link href="#proizvodi" className="cta primary" scroll>
                  Pogledaj ponudu <ArrowUpRight size={18} />
                </Link>
                <div className="pill ghost">Na stanju: {items.length}</div>
              </div>
            </div>

            <div className="hero__right">
              <div className="glass slider-card">
                {currentSlide ? (
                  <div className="slider-hero">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentSlide.images?.find((img) => img.isMain)?.url ?? currentSlide.images?.[0]?.url ?? ""}
                      alt={currentSlide.kpName ?? currentSlide.name}
                      className="slider-hero__img"
                    />
                    <div className="slider-hero__overlay">
                      <p className="eyebrow">Izdvajamo</p>
                      <h3>{currentSlide.kpName ?? currentSlide.name}</h3>
                      <p className="price">{formatCurrency(currentSlide.prodajnaCena)}</p>
                      <Link href={`/p/${currentSlide.id}`} className="cta ghost">
                        Detalji <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="empty">Dodajte proizvode da bismo prikazali slajder.</div>
                )}
                {slides.length > 1 && (
                  <div className="slider-dots">
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        type="button"
                        className={`dot ${idx === slideIndex ? "active" : ""}`}
                        onClick={() => setSlideIndex(idx)}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="section" id="proizvodi">
          <div className="section__header">
            <div className="section__title">
              <Sparkles size={18} />
              Katalog
            </div>
            <div className="pill">{isLoading ? "Učitavanje..." : `${filteredItems.length} artikala spremno`}</div>
          </div>

          {isLoading ? (
            <div className="loading">
              <Loader2 className="animate-spin" size={18} />
              Učitavanje proizvoda...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty">Nema proizvoda za prikaz. Dodaj u panelu i pojaviće se ovde.</div>
          ) : (
            <div className="product-grid">
              {filteredItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section className="info-section" id="o-nama">
          <div className="glass info-card">
            <p className="eyebrow">O nama</p>
            <h3 className="detail-subtitle">Alati Mašine</h3>
            <p className="muted">
              Radimo za ljude koji vole da zavrnu rukave. Bilo da popravljaš oko kuće, sređuješ dvorište ili trebaš mašinu za njivu,
              biramo modele koji izdrže i daju vrednost za novac.
            </p>
          </div>
        </section>

        <section className="info-section" id="kontakt">
          <div className="glass info-card contact">
            <div>
              <p className="eyebrow">Kontakt</p>
              <h3 className="detail-subtitle">Tu smo za brza pitanja</h3>
              <p className="muted">Telefon: 064 13 03 177</p>
              <p className="muted">Email: alatmasina@gmail.com</p>
              <div className="meta-row" style={{ marginTop: 8 }}>
                <a href="https://www.facebook.com/profile.php?id=61584422843536" target="_blank" rel="noreferrer" className="nav__icon">
                  Facebook
                </a>
                <a href="https://www.instagram.com/alatmasina/" target="_blank" rel="noreferrer" className="nav__icon">
                  Instagram
                </a>
              </div>
            </div>
            <div className="pill strong">Poruči u par koraka</div>
          </div>
        </section>
      </div>
    </div>
  );
}
