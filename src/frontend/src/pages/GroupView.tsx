/**
 * GroupView — Group chat page.
 * Shows a group conversation using ChatView with a collapsible member panel.
 */
import { useParams } from "@tanstack/react-router";
import { Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ChatView from "../components/ChatView";
import VoidAvatar from "../components/VoidAvatar";
import { useAddGroupMember, useGetGroupInfo } from "../hooks/useQueries";

export default function GroupView() {
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const decoded = decodeURIComponent(groupId);
  const { data: groupInfo } = useGetGroupInfo(decoded);
  const { mutateAsync: addMember, isPending: adding } = useAddGroupMember();
  const [showMembers, setShowMembers] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState("");

  const groupChannel = `GROUP-${decoded}`;

  const handleAddMember = async () => {
    let trimmed = newMemberInput.trim();
    // Auto-complete short hex code to full VOID ID format
    if (/^[a-zA-Z0-9]{6,16}$/.test(trimmed)) {
      trimmed = `@void_shadow_${trimmed}:canister`;
    }
    if (!trimmed) return;
    try {
      await addMember({ groupId: decoded, memberVoidId: trimmed });
      toast.success("Member added to the void");
      setNewMemberInput("");
    } catch {
      toast.error("Could not add member");
    }
  };

  const memberCount = groupInfo?.members?.length ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden w-full relative">
      {/* Members side sheet */}
      {showMembers && (
        <div className="absolute right-0 top-0 h-full w-72 z-20 bg-void-black/95 border-l border-void-gold/20 flex flex-col backdrop-blur-sm">
          {/* Side sheet header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-void-gold/10">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-void-gold/60" />
              <span className="text-white/80 text-sm font-semibold tracking-wider">
                Members
              </span>
              <span className="text-white/30 text-xs font-mono">
                ({memberCount})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMembers(false)}
              className="text-white/30 hover:text-white/60 transition-colors"
              aria-label="Close members panel"
            >
              <X size={16} />
            </button>
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {memberCount === 0 && (
              <p className="text-white/30 text-xs text-center py-6">
                No members yet.
              </p>
            )}
            {(groupInfo?.members ?? []).map((m) => (
              <div
                key={m}
                className="flex items-center gap-3 px-3 py-2 border border-white/5 hover:border-void-gold/10 transition-colors"
              >
                <VoidAvatar voidId={m} size="sm" />
                <span className="text-white/60 text-xs font-mono truncate flex-1">
                  {m}
                </span>
              </div>
            ))}
          </div>

          {/* Add member input */}
          <div className="p-4 border-t border-void-gold/10 space-y-2">
            <div className="text-white/30 text-xs tracking-wider uppercase">
              Add member
            </div>
            <input
              type="text"
              value={newMemberInput}
              onChange={(e) => setNewMemberInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddMember();
              }}
              placeholder="VOID ID or short code"
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-void-gold/50 transition-colors"
            />
            <button
              type="button"
              onClick={handleAddMember}
              disabled={!newMemberInput.trim() || adding}
              className="void-btn-primary w-full py-2 text-xs tracking-widest uppercase disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add to Void"}
            </button>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <ChatView
        channel={groupChannel}
        channelType="dm"
        title={groupInfo?.name ?? `Group ${decoded.slice(0, 8)}`}
        extraHeaderAction={
          <button
            type="button"
            onClick={() => setShowMembers(!showMembers)}
            className={`flex items-center gap-1.5 text-xs transition-colors border px-3 py-1.5 ${
              showMembers
                ? "border-void-gold/40 text-void-gold bg-void-gold/10"
                : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
            }`}
            aria-label="Toggle member list"
          >
            <Users size={12} />
            <span className="font-mono">{memberCount}</span>
          </button>
        }
      />
    </div>
  );
}
