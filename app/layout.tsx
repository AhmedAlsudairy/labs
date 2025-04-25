import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { LanguageProvider } from '@/context/language-context';
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Laboratory Equipment Management Platform",
  description: "A comprehensive solution for laboratory equipment management in Oman",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <LanguageProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="min-h-screen flex flex-col">
              <div className="flex-1 w-full flex flex-col">
                <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                  <div className="w-full max-w-[2000px] flex justify-between items-center p-3 px-4">
                    <div className="flex gap-4 items-center font-semibold">
                      <Link className="ff text-xl font-bold" href="/">OptiLab</Link>
                      <div className="flex items-center gap-2">
                
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <LanguageSwitcher />
                      {!hasEnvVars ? (
                        <EnvVarWarning />
                      ) : (
                        <HeaderAuth />
                      )}
                    </div>
                  </div>
                </nav>

                <div className="flex-1 w-full max-w-[2000px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
                  {children}
                </div>

                <footer className="w-full border-t">
                  <div className="max-w-[2000px] mx-auto px-3 sm:px-4 py-6 flex items-center justify-center gap-4 text-xs">
                    <p>
                      Laboratory Equipment Management Platform in Oman
                    </p>
                    <ThemeSwitcher />
                  </div>
                </footer>
              </div>
            </main>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
