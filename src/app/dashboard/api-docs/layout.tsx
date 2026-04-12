import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API docs — Dashboard",
};

export default function ApiDocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
