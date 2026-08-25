import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser
} from "@/lib/server/auth";

type AiTutorAuthenticatedIdentity = {
  user: {
    id: string;
  };
};

function missingExpectedUserResponse() {
  return Response.json(
    {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    },
    {
      status: 409,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

/**
 * Guest chat keeps its existing registration-required flow. Once a request is
 * authenticated, however, every account-bound AI Tutor operation must prove
 * which browser identity initiated it before policy, quota, provider, or
 * persistence work can run.
 */
export function guardAiTutorExpectedUser(
  authenticated: AiTutorAuthenticatedIdentity | null,
  request: Request,
  body?: unknown
) {
  if (!authenticated) return null;

  const constraints = [
    ...expectedUserConstraintsFromRequest(request),
    ...bodyExpectedUserConstraints(body)
  ];
  if (constraints.length === 0) return missingExpectedUserResponse();

  return guardExpectedAuthenticatedUser(authenticated, constraints);
}
