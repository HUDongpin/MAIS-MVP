import { isGoogleOAuthConfigured } from "@/lib/server/googleOAuth";
import LoginPageClient from "./LoginPageClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ googleError?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialGoogleError = Array.isArray(params.googleError) ? params.googleError[0] ?? "" : params.googleError ?? "";

  return (
    <LoginPageClient
      googleSignInAvailable={isGoogleOAuthConfigured()}
      initialGoogleError={initialGoogleError}
    />
  );
}
