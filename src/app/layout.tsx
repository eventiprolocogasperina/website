import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Pro Loco Gasperina APS",
    template: "%s | Pro Loco Gasperina APS",
  },
  description:
    "Associazione di Promozione Sociale che valorizza la cultura, le tradizioni e il turismo di Gasperina (CZ). Scopri eventi, progetti e la bellezza della Calabria.",
  keywords: ["Gasperina", "Pro Loco", "Calabria", "eventi", "turismo", "cultura", "tradizioni"],
  openGraph: {
    title: "Pro Loco Gasperina APS",
    description: "Valorizzare la cultura e il territorio di Gasperina, Calabria.",
    type: "website",
    locale: "it_IT",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  );
}
