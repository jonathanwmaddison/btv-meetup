import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Instrument_Serif, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const headingFont = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "BTV Meetup",
  description: "Burlington tech meetup hub"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <Nav />
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
