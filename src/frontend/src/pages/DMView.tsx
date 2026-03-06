import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import ChatView from "../components/ChatView";
import { useGetCosmicHandle } from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import { getCachedHandle, registerKnownUser } from "../lib/userRegistry";

function getDMPartner(channelId: string, myVoidId: string): string {
  const withoutPrefix = channelId.replace("DM-", "");
  const parts = withoutPrefix.split("_");
  const partner = parts.find((p) => !myVoidId.includes(p));
  return partner ? `@void_shadow_${partner}:canister` : channelId;
}

function useDMPartnerTitle(decoded: string, myVoidId: string | null): string {
  const partner = myVoidId ? getDMPartner(decoded, myVoidId) : decoded;
  const cachedHandle = getCachedHandle(partner);
  const { data: fetchedHandle } = useGetCosmicHandle(partner);

  useEffect(() => {
    if (fetchedHandle) registerKnownUser(partner, fetchedHandle);
  }, [fetchedHandle, partner]);

  const handle = fetchedHandle ?? cachedHandle;
  if (handle) return `@${handle.replace(/^@/, "")}`;
  const shortId = partner.replace("@void_shadow_", "").replace(":canister", "");
  return `void_${shortId.slice(0, 8)}`;
}

export default function DMView() {
  const { channelId } = useParams({ from: "/dms/$channelId" });
  const decoded = decodeURIComponent(channelId);
  const myVoidId = useVoidId();
  const title = useDMPartnerTitle(decoded, myVoidId);

  return <ChatView channel={decoded} channelType="dm" title={`💬 ${title}`} />;
}
