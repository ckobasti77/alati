import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moja Evidencija Prodaje",
  description: "Interna evidencija prodaje - brz unos i pregled profita."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        <Providers>
          <div className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div>
                  <h1 className="text-lg font-semibold">
                    Moja Evidencija Prodaje
                  </h1>
                  <p className="text-sm text-slate-500">
                    Brz unos, jasna kontrola profita.
                  </p>
                </div>
                <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
                  <Link href="/">Kontrolna tabla</Link>
                  <Link href="/prodaje">Prodaje</Link>
                  <Link href="/proizvodi">Proizvodi</Link>
                </nav>
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
