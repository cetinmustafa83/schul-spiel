import type { Metadata, Viewport } from "next";
import { Baloo_2, Lexend } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Wissensgipfel — Besteige den Berg des Wissens",
  description:
    "Wissensgipfel ist eine quiz-basierte Lern-App für Schüler:innen der Klassen 5–8. Spiele kostenlos, wiederhole Schulstoff und erreiche den Gipfel — 500.000 Taler Spielgeld warten!",
  keywords: [
    "Wissensgipfel",
    "Quiz",
    "Lernspiel",
    "Schule",
    "Deutschland",
    "NRW",
    "Klasse 5",
    "Klasse 6",
    "Klasse 7",
    "Klasse 8",
    "Lern-App",
    "DSGVO",
  ],
  authors: [{ name: "DFM Solutions" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Wissensgipfel — Besteige den Berg des Wissens",
    description:
      "Eine DSGVO-freundliche Lern-App für die Klassen 5–8. Klettere die 15-stufige Taler-Leiter hinauf.",
    type: "website",
    locale: "de_DE",
  },
};

export const viewport: Viewport = {
  themeColor: "#12102B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <body
        className={`${baloo.variable} ${lexend.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
