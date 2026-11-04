import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";
import { AppHeader } from "@/components/shell/AppHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { ShellProvider } from "@/components/shell/ShellProvider";

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
  applicationName: "Alati",
  appleWebApp: {
    capable: true,
    title: "Alati",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/logo.png", sizes: "500x500", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // ThemeProvider ih prepisuje bojom izabrane teme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
      const color = theme === "dark" ? "#0a0a0a" : "#f8fafc";
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", color));
    } catch (error) {}
  })();`;

  return (
    <html lang="sr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
        <Providers>
          <ShellProvider>
            <div className="min-h-dvh" style={{ backgroundColor: "var(--panel-bg)" }}>
              <AppHeader />
              <main id="main" tabIndex={-1} className="mx-auto max-w-7xl outline-none pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] pl-[max(1rem,env(safe-area-inset-left))] md:px-6 md:py-8">
                {children}
              </main>
              <BottomNav />
            </div>
          </ShellProvider>
        </Providers>
      </body>
    </html>
  );
}
