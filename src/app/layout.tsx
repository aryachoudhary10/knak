import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import "./globals.css";

/** High-contrast Didone for the wordmark, titles and dish names, as on a couture house's menu card. */
const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

/** A restrained geometric sans, Parisian Art Deco in origin, for navigation, prices and hints. */
const sans = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const DESCRIPTION = "Walk into KNAK, take a seat, and order from the counter for home delivery.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://knak.vercel.app"),
  title: "KNAK · Grand Café",
  description: DESCRIPTION,
  // The preview card when the link is shared on WhatsApp, Instagram or X; the image is opengraph-image.jpg beside this file.
  openGraph: { title: "KNAK · Grand Café", description: DESCRIPTION, siteName: "KNAK", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image", title: "KNAK · Grand Café", description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0e0c0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
