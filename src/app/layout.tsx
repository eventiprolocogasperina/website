import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";
import WhatsAppWidget from "@/components/ui/WhatsAppWidget";

export const metadata: Metadata = {
  metadataBase: new URL('https://prolocogasperina.it'),
  title: {
    default: "Pro Loco Gasperina APS | Cultura e Tradizione",
    template: "%s | Pro Loco Gasperina APS",
  },
  description:
    "Associazione di Promozione Sociale che valorizza la cultura, le tradizioni e il turismo di Gasperina (CZ). Scopri eventi, progetti e la bellezza della Calabria.",
  keywords: ["Gasperina", "Pro Loco", "Calabria", "eventi", "turismo", "cultura", "tradizioni"],
  authors: [{ name: "Pro Loco Gasperina APS" }],
  creator: "Pro Loco Gasperina APS",
  publisher: "Pro Loco Gasperina APS",
  openGraph: {
    title: "Pro Loco Gasperina APS",
    description: "Valorizzare la cultura e il territorio di Gasperina, Calabria.",
    url: 'https://prolocogasperina.it',
    siteName: 'Pro Loco Gasperina',
    type: "website",
    locale: "it_IT",
  },
  icons: {
    icon: '/img/Logo_color_sm.png',
    apple: '/img/Logo_color_sm.png',
  },
  verification: {
    google: '5a7cyeWSdzLeQfO6uutHBD2s1A9Zpmb40I7qedPI8oE',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            try {
              if (localStorage.theme === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                document.documentElement.setAttribute('data-theme', 'light');
              } else {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            } catch (_) {}
          `}
        </Script>
      </head>
      <body>
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <WhatsAppWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
