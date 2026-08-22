import { curriculumProfileForTrack } from "@/lib/curriculumProfile";
import { authenticateGoogleIdentityForLogin } from "@/lib/server/userStore";

async function main() {
  const providerSubject = process.argv[2]?.trim() ?? "";
  const email = process.argv[3]?.trim() ?? "";
  if (!providerSubject || !email) {
    throw new Error("Google auth process worker requires a provider subject and email fixture.");
  }

  const result = await authenticateGoogleIdentityForLogin({
    providerSubject,
    email,
    emailVerified: true,
    emailAuthoritative: true,
    displayName: "Process Persistence Student",
    requestedRole: "student",
    studentAge13OrOlder: true,
    grade: "S4",
    curriculumProfile: curriculumProfileForTrack("HK"),
    language: "en",
    theme: "dark"
  });

  console.log(JSON.stringify({
    status: result.status,
    ...(result.status === "created" || result.status === "linked" || result.status === "authenticated"
      ? { userId: result.session.user.id }
      : {})
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Google auth process worker failed.");
  process.exitCode = 1;
});
