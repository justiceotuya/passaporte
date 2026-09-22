import type { Metadata } from "next";
import { Fredoka, Nunito, Source_Serif_4 } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeSync } from "@/components/ThemeSync";
import { isConvexConfigured } from "@/lib/convex-env";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  variable: "--font-book",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Passaporte",
  description: "Gamified A1 Portuguese practice",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialToken: string | null = null;
  if (isConvexConfigured()) {
    try {
      const { getToken } = await import("@/lib/auth-server");
      initialToken = (await getToken()) ?? null;
    } catch {
      initialToken = null;
    }
  }

  return (
    <html
      lang="en"
      data-theme="light"
      className={`light ${nunito.variable} ${fredoka.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <ConvexClientProvider initialToken={initialToken}>
          <ThemeSync />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
