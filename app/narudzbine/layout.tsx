import type { Metadata } from "next";

export const metadata: Metadata = { title: "Narudžbine" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
