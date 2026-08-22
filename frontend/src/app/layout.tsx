import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMS Operations & SLA Management System",
  description: "Internal AMS operations, shift tracking, SLA monitoring, and team management platform",
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
