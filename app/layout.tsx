import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Toast } from "@/components/ui";
import { TabBar } from "@/components/TabBar";

export const metadata: Metadata = {
  title: "Nudge",
  description: "Split shared bills with roommates and get paid back without chasing anyone.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#534AB7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface sm:border-x sm:border-line">
            {children}
            <TabBar />
          </div>
          <Toast />
        </StoreProvider>
      </body>
    </html>
  );
}
