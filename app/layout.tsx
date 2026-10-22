import type { Metadata } from "next";
import { Geist, Geist_Mono, Henny_Penny } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Halloween logo font — only applied while html[data-season="halloween"] (see globals.css)
const spooky = Henny_Penny({
  variable: "--font-spooky",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "timOR",
  description: "Riham & Omar's daily accountability tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spooky.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
