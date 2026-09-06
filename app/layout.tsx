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
import { ClientErrorReporter } from "@/components/observability/ClientErrorReporter";
import { AppProviders } from "@/components/providers/AppProviders";
import {
  toAuthenticatedAppShellBootstrap,
  type AppShellBootstrap
} from "@/lib/appShellBootstrap";
import { localeForLanguage } from "@/lib/i18n";
import { getRequestSessionContext } from "@/lib/server/requestSession";

export const metadata: Metadata = {
  title: "MAIS",
  description: "A bilingual interactive mathematics learning template for Hong Kong P1-S6 students."
};

const shouldRenderVercelAnalytics = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const shouldReportClientErrors = Boolean(process.env.SENTRY_DSN || process.env.ERROR_MONITOR_WEBHOOK_URL);

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Authenticated app chrome must be rendered from the same request-bound,
  // allowlisted state that the client receives. Auth/storage failures propagate
  // to the route boundary; they must never be disguised as a guest document.
  const requestSession = await getRequestSessionContext();
  const initialBootstrap: AppShellBootstrap = requestSession.authenticated
    ? toAuthenticatedAppShellBootstrap(requestSession.authenticated)
    : { kind: "guest", hadSessionCookie: requestSession.hadSessionCookie };
  const initialLanguage = initialBootstrap.kind === "authenticated" ? initialBootstrap.settings.language : "en";
  const initialTheme = initialBootstrap.kind === "authenticated" ? initialBootstrap.settings.theme : "light";

  return (
    <html
      lang={localeForLanguage(initialLanguage)}
      className={initialTheme === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <body>
        <AppProviders initialBootstrap={initialBootstrap}>
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
        {shouldReportClientErrors ? <ClientErrorReporter /> : null}
        {shouldRenderVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  );
}
