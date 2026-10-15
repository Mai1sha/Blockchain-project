import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ServicePortal | Online Professional Services",
  description:
    "A blockchain-supported professional-service marketplace featuring provider verification, engagement tracking, and smart-contract escrow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}