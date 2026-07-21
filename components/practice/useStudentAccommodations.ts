"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { defaultStudentAccommodations, normalizeStudentAccommodations } from "@/lib/accommodations";
import type { StudentAccommodations } from "@/types";

// Shared, per-student fetch of the effective accommodations. Cached at module
// scope so the practice banner and the read-aloud control resolve from a single
// network request per student, and re-fetched when the signed-in student changes.
let accommodationsCache: { userId: string; promise: Promise<StudentAccommodations> } | null = null;

async function fetchStudentAccommodations(): Promise<StudentAccommodations> {
  try {
    const response = await fetch("/api/student/accommodations");
    if (!response.ok) return { ...defaultStudentAccommodations };
    const payload = await response.json() as { accommodations?: unknown } | null;
    return normalizeStudentAccommodations(payload?.accommodations);
  } catch {
    return { ...defaultStudentAccommodations };
  }
}

export function useStudentAccommodations(): { accommodations: StudentAccommodations; loaded: boolean } {
  const { currentUser } = useSettings();
  const userId = currentUser?.role === "student" ? currentUser.id : null;
  const [accommodations, setAccommodations] = useState<StudentAccommodations>(defaultStudentAccommodations);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAccommodations({ ...defaultStudentAccommodations });
      setLoaded(true);
      return;
    }

    let active = true;
    if (!accommodationsCache || accommodationsCache.userId !== userId) {
      accommodationsCache = { userId, promise: fetchStudentAccommodations() };
    }
    setLoaded(false);
    accommodationsCache.promise.then((resolved) => {
      if (!active) return;
      setAccommodations(resolved);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  return { accommodations, loaded };
}
