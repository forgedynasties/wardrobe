import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { OutfitAdminPanel } from "@/components/outfit-admin-panel";
import { PwaRegister } from "@/components/pwa-register";
import { TopBar } from "@/components/top-bar";
import { OutfitReminder } from "@/components/outfit-reminder";
import { UserGate } from "@/components/user-gate";
import { UserProvider } from "@/lib/user-context";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Hangur",
  description: "Digital hangur manager",
  applicationName: "Hangur",
  appleWebApp: {
    capable: true,
    title: "Hangur",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
      className={`${dmSans.variable} ${dmSerifDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('hangur-theme');document.documentElement.classList.toggle('dark',t==='dark'||t===null)})()`,
          }}
        />
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
