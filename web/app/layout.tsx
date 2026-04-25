import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { OutfitAdminPanel } from "@/components/outfit-admin-panel";
import { PwaRegister } from "@/components/pwa-register";
import { TopBar } from "@/components/top-bar";
import { OutfitReminder } from "@/components/outfit-reminder";
import { UserGate } from "@/components/user-gate";
import { UserProvider } from "@/lib/user-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wardrobe",
  description: "Digital wardrobe manager",
  applicationName: "Wardrobe",
  appleWebApp: {
    capable: true,
    title: "Wardrobe",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <UserProvider>
          <UserGate>
            <TopBar />
            <main className="flex-1 pb-20">{children}</main>
            <NavBar />
            <OutfitReminder />
            <OutfitAdminPanel />
          </UserGate>
        </UserProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
