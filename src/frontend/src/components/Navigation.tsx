import { useQueryClient } from "@tanstack/react-query";
/**
 * Navigation — Sidebar (desktop), drawer + bottom nav (mobile).
 * Adds NFT, Offerings, Mining and Invite button.
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Crown,
  Gift,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Share2,
  Sparkles,
  Sun,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAvatar } from "../hooks/useAvatar";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile, useIsCallerAdmin } from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import { getStoredTotalUnread } from "../pages/Messages";
import InviteModal from "./InviteModal";

// ─── Bottom nav items (mobile — max 5) ───────────────────────────────────────
const BOTTOM_NAV_ITEMS = [
  {
    path: "/light-room",
    label: "Light",
    icon: Sun,
    color: "text-void-gold",
    ocid: "nav.light_room.link",
  },
  {
    path: "/dark-room",
    label: "Dark",
    icon: Moon,
    color: "text-void-purple",
    ocid: "nav.dark_room.link",
  },
  {
    path: "/dms",
    label: "Messages",
    icon: MessageSquare,
    color: "text-white/70",
    ocid: "nav.messages.link",
  },
  {
    path: "/mining",
    label: "Mining",
    icon: Zap,
    color: "text-void-gold",
    ocid: "nav.mining.link",
  },
  {
    path: "/profile",
    label: "Profile",
    icon: User,
    color: "text-void-gold",
    ocid: "nav.profile.link",
  },
];

// ─── Full sidebar nav items ───────────────────────────────────────────────────
const BASE_NAV_ITEMS = [
  {
    path: "/light-room",
    label: "Light Room",
    icon: Sun,
    color: "text-void-gold",
  },
  {
    path: "/dark-room",
    label: "Dark Room",
    icon: Moon,
    color: "text-void-purple",
  },
  {
    path: "/dms",
    label: "Messages",
    icon: MessageSquare,
    color: "text-white/70",
  },
  { path: "/mining", label: "Mining", icon: Zap, color: "text-void-gold" },
  {
    path: "/nft",
    label: "NFT Marketplace",
    icon: Sparkles,
    color: "text-void-purple",
  },
  {
    path: "/offerings",
    label: "Value Offerings",
    icon: Gift,
    color: "text-white/70",
  },
  { path: "/profile", label: "Profile", icon: User, color: "text-white/70" },
];

// Admin-only nav item
const CREATOR_NAV_ITEM = {
  path: "/creator",
  label: "Creator",
  icon: Crown,
  color: "text-void-gold",
};

export default function Navigation() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: isAdmin } = useIsCallerAdmin();
  const voidId = useVoidId();
  const avatarUrl = useAvatar(voidId ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(() => getStoredTotalUnread());

  // Poll unread count from localStorage every 2.5s so badge stays fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalUnread(getStoredTotalUnread());
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentPath = routerState.location.pathname;

  // Check founder mode from localStorage (set via Profile settings)
  const isFounderMode = voidId
    ? localStorage.getItem(`void_founder_mode_${voidId}`) === "true"
    : false;

  // Build nav items: base items + admin-only creator portal (via backend OR founder mode)
  const NAV_ITEMS =
    isAdmin || isFounderMode
      ? [...BASE_NAV_ITEMS, CREATOR_NAV_ITEM]
      : BASE_NAV_ITEMS;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: "/" });
  };

  const handleNav = (path: string) => {
    navigate({ to: path });
    setMobileOpen(false);
  };

  const displayName =
    userProfile?.cosmicHandle || voidId?.slice(0, 20) || "Void Traveler";

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-void-black/95 border-r border-void-gold/10 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-void-gold/10">
          <div className="flex items-center gap-3">
            <img
              src="/assets/generated/void-logo.dim_256x256.png"
              alt="VOID"
              className="w-8 h-8 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]"
            />
            <span className="void-glow-text text-xl font-black tracking-[0.3em]">
              VOID
            </span>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-void-gold/10">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-10 h-10 rounded-full border border-void-gold/30 shadow-[0_0_10px_rgba(255,215,0,0.2)]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-void-gold text-sm font-bold truncate flex items-center gap-1.5">
                {displayName}
                {isFounderMode && (
                  <Crown size={12} className="text-void-gold shrink-0" />
                )}
              </div>
              <div className="text-white/30 text-xs font-mono truncate mt-0.5">
                {voidId?.slice(0, 28)}
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon, color }) => {
            const isActive = currentPath === path;
            const isCreator = path === "/creator";
            const ocid = `nav.${path.replace(/^\//, "").replace(/-/g, "_")}.link`;
            return (
              <button
                key={path}
                type="button"
                data-ocid={ocid}
                onClick={() => handleNav(path)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                  isActive
                    ? "bg-void-gold/10 border-l-2 border-void-gold text-white"
                    : isCreator
                      ? "text-void-gold/60 hover:text-void-gold hover:bg-void-gold/8 border-l-2 border-void-gold/20 hover:border-void-gold/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border-l-2 border-transparent"
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-void-gold" : color}
                />
                <span className="tracking-wider">{label}</span>
                {isCreator && !isActive && (
                  <span className="ml-auto text-void-gold/30 text-xs">✦</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Invite button */}
        <div className="px-4 pb-2">
          <button
            type="button"
            data-ocid="nav.invite.button"
            onClick={() => setInviteOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/40 hover:text-void-gold hover:bg-void-gold/5 transition-all border border-void-gold/10 hover:border-void-gold/30"
          >
            <Share2 size={16} className="text-void-gold/50" />
            <span className="tracking-wider">Invite Friends</span>
          </button>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-void-gold/10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/30 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            <span className="tracking-wider">Exit Void</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ───────────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-void-black/95 border-b border-void-gold/10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img
            src="/assets/generated/void-logo.dim_256x256.png"
            alt="VOID"
            className="w-6 h-6 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]"
          />
          <span className="void-glow-text text-lg font-black tracking-[0.3em]">
            VOID
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white/60 hover:text-white p-1"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile Drawer ────────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-void-black/95 pt-14 flex flex-col">
          <div className="p-4 border-b border-void-gold/10">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-10 h-10 rounded-full border border-void-gold/30"
              />
              <div>
                <div className="text-white/80 text-sm">{displayName}</div>
                <div className="text-white/30 text-xs">{voidId}</div>
              </div>
            </div>
          </div>
          <nav className="p-4 space-y-1 flex-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon, color }) => {
              const isActive = currentPath === path;
              const isCreator = path === "/creator";
              const ocid = `nav.${path.replace(/^\//, "").replace(/-/g, "_")}.link`;
              return (
                <button
                  key={path}
                  type="button"
                  data-ocid={ocid}
                  onClick={() => handleNav(path)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-sm transition-all ${
                    isActive
                      ? "text-void-gold"
                      : isCreator
                        ? "text-void-gold/60"
                        : "text-white/50"
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? "text-void-gold" : color}
                  />
                  <span className="tracking-wider text-base">{label}</span>
                  {isCreator && !isActive && (
                    <span className="ml-auto text-void-gold/30 text-xs">✦</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Invite button in drawer */}
          <div className="px-4 pb-2">
            <button
              type="button"
              data-ocid="nav.invite.button"
              onClick={() => {
                setMobileOpen(false);
                setInviteOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-4 text-sm text-void-gold/60 hover:text-void-gold transition-colors"
            >
              <Share2 size={18} className="text-void-gold/50" />
              <span className="tracking-wider text-base">Invite Friends</span>
            </button>
          </div>

          <div className="p-4 border-t border-void-gold/10">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-4 text-sm text-white/30 hover:text-red-400"
            >
              <LogOut size={18} />
              <span className="tracking-wider text-base">Exit Void</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────────── */}
      {/* Exactly 5 items: Light, Dark, Messages, Mining, Profile */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-void-black/98 border-t border-void-gold/10 flex"
        style={{ backdropFilter: "blur(20px)" }}
      >
        {BOTTOM_NAV_ITEMS.map(({ path, label, icon: Icon, ocid }) => {
          const isActive = currentPath === path;
          const isDarkTab = path === "/dark-room";
          const isMiningTab = path === "/mining";
          const isMessagesTab = path === "/dms";

          const activeIconColor = isDarkTab ? "#9333ea" : "#FFD700";
          const activeGlow = isDarkTab
            ? "drop-shadow(0 0 8px rgba(147,51,234,0.9))"
            : "drop-shadow(0 0 8px rgba(255,215,0,0.9))";

          return (
            <button
              key={path}
              type="button"
              data-ocid={ocid}
              onClick={() => handleNav(path)}
              className="flex-1 flex flex-col items-center py-2.5 gap-1 text-xs transition-all relative"
              style={
                isActive
                  ? {
                      color: activeIconColor,
                      boxShadow: "inset 0 0 12px rgba(255,255,255,0.05)",
                      borderTop: "2px solid rgba(255,255,255,0.7)",
                    }
                  : {
                      color: "rgba(255,255,255,0.3)",
                      borderTop: "2px solid transparent",
                    }
              }
            >
              {/* White glow behind active icon */}
              {isActive && (
                <span
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full pointer-events-none"
                  style={{
                    background: isDarkTab
                      ? "radial-gradient(circle, rgba(147,51,234,0.25) 0%, transparent 70%)"
                      : isMiningTab
                        ? "radial-gradient(circle, rgba(147,51,234,0.2) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)",
                    filter: "blur(4px)",
                  }}
                />
              )}
              <div className="relative">
                <Icon
                  size={20}
                  style={
                    isActive
                      ? { color: activeIconColor, filter: activeGlow }
                      : { color: "rgba(255,255,255,0.3)" }
                  }
                />
                {/* Unread badge for Messages tab */}
                {isMessagesTab && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-red-500 text-white leading-none">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </div>
              <span
                className="tracking-wide font-medium"
                style={{ fontSize: "10px" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Invite Modal ─────────────────────────────────────────────────────── */}
      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        voidId={voidId ?? ""}
      />
    </>
  );
}
