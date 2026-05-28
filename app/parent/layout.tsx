import type { ReactNode } from "react";
import { ParentShell } from "@/components/parent/ParentShell";
import { getParentFoundationForPage } from "./getParentFoundation";

export const dynamic = "force-dynamic";

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const foundation = await getParentFoundationForPage();

  return (
    <ParentShell parent={foundation.parent} children={foundation.children} childrenContent={children} />
  );
}
