import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ModalProvider } from "@/providers/ModalProvider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZUZU PET - Kasa Otomasyonu POS",
  description: "Next.js + Electron Tek Tıkla Çalışan Masaüstü POS Kasa Otomasyonu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`dark ${outfit.variable}`}>
      <body className="antialiased bg-[#0b0f19] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
        <ModalProvider>
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
