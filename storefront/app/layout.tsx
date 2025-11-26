import type { Metadata } from "next";
import { Space_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Navbar } from "../components/Navbar";


const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Alati | Storefront",
  description: "Futuristicki pregled proizvoda - svetla i tamna tema za kupce.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr">
      <body className={`${grotesk.variable} ${mono.variable}`}>
        <Providers>
          <div className="bg-orb" />
          <Navbar />
          <main className="page-shell">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
