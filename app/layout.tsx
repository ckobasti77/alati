import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";
import { AppHeader } from "@/components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Evidencija Narudzbina",
  description: "Interna evidencija narudzbina - brz unos i pregled profita.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `(() => {
    try {
      const stored = window.localStorage.getItem("alati-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)")?.matches;
      const theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {}
  })();`;

  return (
    <html lang="sr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <Providers>
          <div className="min-h-screen" style={{ backgroundColor: "var(--panel-bg)" }}>
            <AppHeader />
            <main className="mx-auto px-6 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
