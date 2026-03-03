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
import { useState } from "react";
import { useAvatar } from "../hooks/useAvatar";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile, useIsCallerAdmin } from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import InviteModal from "./InviteModal";

// ─── Bottom nav items (mobile — max 5) ───────────────────────────────────────
const BOTTOM_NAV_ITEMS = [
  {
    path: "/light-room",
    label: "Light",
    icon: Sun,
    color: "text-void-gold",
  },
  {
    path: "/dark-room",
    label: "Dark",
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
  { path: "/nft", label: "NFT", icon: Sparkles, color: "text-void-purple" },
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

  const currentPath = routerState.location.pathname;

  // Build nav items: base items + admin-only creator portal
  const NAV_ITEMS = isAdmin
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
              className="w-10 h-10 rounded-full border border-void-gold/30"
            />
            <div className="min-w-0">
              <div className="text-white/80 text-sm font-medium truncate">
                {displayName}
              </div>
              <div className="text-white/30 text-xs truncate">{voidId}</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon, color }) => {
            const isActive = currentPath === path;
            const isCreator = path === "/creator";
            return (
              <button
                key={path}
                type="button"
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
              return (
                <button
                  key={path}
                  type="button"
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
      {/* 5 items: Light, Dark, Messages, Mining, NFT — Profile/Creator via drawer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-void-black/95 border-t border-void-gold/10 flex">
        {BOTTOM_NAV_ITEMS.map(({ path, label, icon: Icon, color }) => {
          const isActive = currentPath === path;
          const isDarkTab = path === "/dark-room";
          const isLightTab = path === "/light-room";
          const activeColor = isDarkTab
            ? "text-void-purple"
            : isLightTab
              ? "text-void-gold"
              : "text-void-gold";
          return (
            <button
              key={path}
              type="button"
              data-ocid="nav.link"
              onClick={() => handleNav(path)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                isActive ? activeColor : "text-white/30"
              }`}
              style={
                isActive
                  ? {
                      borderTop: isDarkTab
                        ? "2px solid rgba(142,45,226,0.7)"
                        : isLightTab
                          ? "2px solid rgba(255,215,0,0.7)"
                          : "2px solid rgba(255,215,0,0.5)",
                    }
                  : { borderTop: "2px solid transparent" }
              }
            >
              <Icon
                size={18}
                className={
                  isActive
                    ? isDarkTab
                      ? "text-void-purple"
                      : "text-void-gold"
                    : color
                }
                style={
                  isActive
                    ? {
                        filter: isDarkTab
                          ? "drop-shadow(0 0 6px rgba(142,45,226,0.8))"
                          : "drop-shadow(0 0 6px rgba(255,215,0,0.8))",
                      }
                    : undefined
                }
              />
              <span className="tracking-wide">{label}</span>
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
