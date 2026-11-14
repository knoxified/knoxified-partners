import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knoxified Partners",
  description: "Track your referrals and payouts.",
  icons: { icon: "/favicon.png" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
