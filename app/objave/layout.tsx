import type { Metadata } from "next";

export const metadata: Metadata = { title: "Objave" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
