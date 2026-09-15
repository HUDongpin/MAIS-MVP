import { aiTutorUnknownPathCacheHeaders } from "@/lib/aiTutorReadCache";

export const runtime = "edge";

function unknownAiTutorPathResponse() {
  return new Response(JSON.stringify({ error: "Not found." }), {
    status: 404,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...aiTutorUnknownPathCacheHeaders()
    }
  });
}

export function GET() {
  return unknownAiTutorPathResponse();
}

export function POST() {
  return unknownAiTutorPathResponse();
}

export function PUT() {
  return unknownAiTutorPathResponse();
}

export function PATCH() {
  return unknownAiTutorPathResponse();
}

export function DELETE() {
  return unknownAiTutorPathResponse();
}
