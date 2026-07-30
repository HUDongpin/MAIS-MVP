import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AITutorProvider } from "@/components/ai/AITutorProvider";
import { AnimatedMathBackground } from "@/components/background/AnimatedMathBackground";
import { Footer } from "@/components/layout/Footer";
import { GuestLoginPromptGate } from "@/components/layout/GuestLoginPromptGate";
import { DiagnosticPlacementGate } from "@/components/layout/DiagnosticPlacementGate";
import { LearnerStartSetupGate } from "@/components/layout/LearnerStartSetupGate";
import { Navbar } from "@/components/layout/Navbar";
import { StudentBackToTopButton } from "@/components/layout/StudentBackToTopButton";
import { StudentGuidedTour } from "@/components/onboarding/StudentGuidedTour";
import { AppProviders } from "@/components/providers/AppProviders";
import { DEFAULT_LANGUAGE_TAG, languageBootstrapScript } from "@/lib/languageBootstrap";

export const metadata: Metadata = {
  title: "MAIS",
  description: "A bilingual interactive mathematics learning template for Hong Kong P1-S6 students."
};

const shouldRenderVercelAnalytics = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={DEFAULT_LANGUAGE_TAG} suppressHydrationWarning>
      <head>
        {/* Applies the visitor's language to <html lang> before first paint — WCAG 2.1
            SC 3.1.1. See lib/languageBootstrap.ts for why this cannot wait for React. */}
        <script dangerouslySetInnerHTML={{ __html: languageBootstrapScript }} />
      </head>
      <body className="overflow-x-hidden">
        <AppProviders>
          <AITutorProvider>
            <AnimatedMathBackground />
            <div className="relative z-10 flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1 pb-20 sm:pb-0">{children}</main>
              <Footer />
            </div>
            <StudentBackToTopButton />
            <GuestLoginPromptGate />
            <LearnerStartSetupGate />
            <DiagnosticPlacementGate />
            <StudentGuidedTour />
          </AITutorProvider>
        </AppProviders>
        {shouldRenderVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  );
}
