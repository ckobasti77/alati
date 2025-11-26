"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Facebook, Instagram, Menu, ShoppingCart, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const navLinks = [
  { label: "O nama", href: "#o-nama" },
  { label: "Kontakt", href: "#kontakt" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="nav__left">
        <ThemeToggle />
        <Link href="#proizvodi" className="nav__link">
          Proizvodi
        </Link>
        <Link href="#kategorije" className="nav__link">
          Kategorije
        </Link>
      </div>

      <div className="nav__logo">
        <Image
          src="/logo-for-light-theme.png"
          alt="Alati Mašine"
          width={160}
          height={44}
          className="logo light-only"
          priority
        />
        <Image
          src="/logo-for-dark-theme.png"
          alt="Alati Mašine"
          width={160}
          height={44}
          className="logo dark-only"
          priority
        />
      </div>

      <div className="nav__right">
        <div className="nav__links">
          {navLinks.map((item) => (
            <Link key={item.label} href={item.href} className="nav__link">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav__icons">
          <a href="https://www.facebook.com/profile.php?id=61584422843536" target="_blank" rel="noreferrer" className="nav__icon">
            <Facebook size={18} />
          </a>
          <a href="https://www.instagram.com/alatmasina/" target="_blank" rel="noreferrer" className="nav__icon">
            <Instagram size={18} />
          </a>
          <button type="button" className="nav__icon" aria-label="Pregled korpe">
            <ShoppingCart size={18} />
          </button>
        </div>
        <button
          type="button"
          className="nav__menu"
          aria-label="Mobilni meni"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="nav__mobile">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="nav__link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
