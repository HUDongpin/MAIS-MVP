import { permanentRedirect } from "next/navigation";

export default function LegacyAdventureIslandRedirectPage() {
  permanentRedirect("/practice/adventure-island");
}
