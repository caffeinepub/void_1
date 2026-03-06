/**
 * NFTMarketplace — Cosmic Legacy NFT Marketplace
 * Mint, browse, resonate, and buy/sell eternal wisdom as ICRC-7 NFTs on ICP.
 */
import { Loader2, Sparkles, X, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type CosmicNFT, NFTCategory } from "../backend";
import {
  useBuyNFT,
  useGetMarketplaceListings,
  useGetUserNFTs,
  useGetWisdomScore,
  useMintNFT,
  useResonateNFT,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";

// ─── Category labels ──────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<NFTCategory, string> = {
  [NFTCategory.lightWisdom]: "Light Wisdom",
  [NFTCategory.deepShadow]: "Deep Shadow",
  [NFTCategory.guidedBreathwork]: "Guided Breathwork",
  [NFTCategory.sageReflection]: "Sage Reflection",
};

const CATEGORY_COLORS: Record<NFTCategory, string> = {
  [NFTCategory.lightWisdom]: "rgba(255,215,0,0.8)",
  [NFTCategory.deepShadow]: "rgba(142,45,226,0.8)",
  [NFTCategory.guidedBreathwork]: "rgba(100,200,255,0.8)",
  [NFTCategory.sageReflection]: "rgba(200,255,150,0.8)",
};

const CATEGORY_BG: Record<NFTCategory, string> = {
  [NFTCategory.lightWisdom]: "rgba(255,215,0,0.1)",
  [NFTCategory.deepShadow]: "rgba(142,45,226,0.1)",
  [NFTCategory.guidedBreathwork]: "rgba(100,200,255,0.1)",
  [NFTCategory.sageReflection]: "rgba(200,255,150,0.1)",
};

// ─── Mint Modal ───────────────────────────────────────────────────────────────
interface MintModalProps {
  wisdomScore: number;
  creatorVoidId: string;
  onClose: () => void;
}

function MintModal({ wisdomScore, creatorVoidId, onClose }: MintModalProps) {
  const { mutateAsync: mintNFT, isPending } = useMintNFT();
  const [postText, setPostText] = useState("");
  const [category, setCategory] = useState<NFTCategory>(
    NFTCategory.lightWisdom,
  );
  const [customRareTrait, setCustomRareTrait] = useState("");

  const handleMint = async () => {
    if (!postText.trim()) {
      toast.error("Enter the wisdom text to mint.");
      return;
    }
    const metadataJson = JSON.stringify({
      category,
      creatorVoidId,
      wisdomScore,
      mintedAt: new Date().toISOString(),
      app: "VOID",
      version: "14",
    });
    try {
      const tokenId = await mintNFT({
        postText: postText.trim(),
        wisdomScore,
        metadataJson,
        category,
        creatorVoidId,
        rareTrait: customRareTrait.trim() || undefined,
      });
      toast.success(`Cosmic Legacy NFT #${tokenId} minted! ✦`);
      onClose();
    } catch (err) {
      console.error("Mint error", err);
      toast.error("Could not mint NFT. Ensure Wisdom Score ≥ 500.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      <div
        className="w-full max-w-md mx-4 p-6 overflow-y-auto max-h-[90vh]"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,0,21,0.98), rgba(0,0,0,0.98))",
          border: "1px solid rgba(255,215,0,0.25)",
          boxShadow: "0 0 40px rgba(255,215,0,0.12)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-void-gold font-bold tracking-wider text-lg">
              Mint Cosmic Legacy ✦
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              Your wisdom becomes eternal
            </p>
          </div>
          <button
            type="button"
            data-ocid="nft.mint_modal.close_button"
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Wisdom Text */}
          <div>
            <label
              htmlFor="mint-wisdom-text"
              className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
            >
              Wisdom to Immortalize
            </label>
            <textarea
              id="mint-wisdom-text"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="The truth that deserves to live forever..."
              rows={4}
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <p className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2">
              Category
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(NFTCategory).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="px-3 py-2.5 text-xs tracking-wide transition-all text-left"
                  style={{
                    background:
                      category === cat
                        ? CATEGORY_BG[cat]
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${category === cat ? CATEGORY_COLORS[cat] : "rgba(255,255,255,0.1)"}`,
                    color:
                      category === cat
                        ? CATEGORY_COLORS[cat]
                        : "rgba(255,255,255,0.4)",
                    boxShadow:
                      category === cat
                        ? `0 0 8px ${CATEGORY_COLORS[cat]}33`
                        : "none",
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Rare Trait (optional) */}
          <div>
            <label
              htmlFor="mint-rare-trait"
              className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
            >
              Rare Trait{" "}
              <span className="text-white/20 normal-case">(optional)</span>
            </label>
            <input
              id="mint-rare-trait"
              type="text"
              value={customRareTrait}
              onChange={(e) => setCustomRareTrait(e.target.value)}
              placeholder="e.g. Sadhguru Echo, Void Transmission..."
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors"
            />
          </div>

          {/* Wisdom score display */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{
              background: "rgba(255,215,0,0.06)",
              border: "1px solid rgba(255,215,0,0.15)",
            }}
          >
            <Zap size={14} className="text-void-gold/60" />
            <span className="text-white/50 text-xs">Your Wisdom Score:</span>
            <span className="text-void-gold font-bold font-mono ml-auto">
              {wisdomScore} WS
            </span>
            {wisdomScore >= 500 ? (
              <span className="text-green-400 text-xs">✓ Eligible</span>
            ) : (
              <span className="text-red-400/70 text-xs">
                Need {500 - wisdomScore} more
              </span>
            )}
          </div>

          {/* 10% royalty note */}
          <p className="text-white/25 text-xs leading-relaxed">
            ✦ 10% royalty on every secondary sale flows back to you forever.
            Your wisdom keeps giving.
          </p>

          <button
            type="button"
            data-ocid="nft.mint_modal.submit_button"
            onClick={handleMint}
            disabled={isPending || !postText.trim()}
            className="void-btn-primary w-full py-3.5 text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {isPending ? "Minting to ICP..." : "Mint as Eternal NFT"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NFT Card ─────────────────────────────────────────────────────────────────
interface NFTCardProps {
  nft: CosmicNFT;
  currentVoidId: string;
  onResonate: (id: bigint) => void;
  onBuy: (id: bigint) => void;
  resonating: boolean;
  buying: boolean;
  index: number;
}

function NFTCard({
  nft,
  currentVoidId,
  onResonate,
  onBuy,
  resonating,
  buying,
  index,
}: NFTCardProps) {
  const [localResonated, setLocalResonated] = useState(false);
  const shortCreator = nft.creatorVoidId
    .replace("@void_shadow_", "")
    .replace(":canister", "")
    .slice(0, 8);

  const catColor = CATEGORY_COLORS[nft.category];
  const catBg = CATEGORY_BG[nft.category];

  const handleResonate = () => {
    if (localResonated) return;
    setLocalResonated(true);
    onResonate(nft.id);
  };

  return (
    <div
      data-ocid={`nft.item.${index}`}
      className="nft-card-glow flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,0,21,0.95) 0%, rgba(0,0,0,0.9) 100%)",
        border: "1px solid rgba(255,215,0,0.2)",
      }}
    >
      {/* NFT Visual Header */}
      <div
        className="h-28 relative overflow-hidden flex items-center justify-center"
        style={{
          background: `radial-gradient(ellipse at center, ${catBg} 0%, rgba(0,0,0,0.8) 70%)`,
          borderBottom: `1px solid ${catColor}33`,
        }}
      >
        {/* Decorative cosmic symbol */}
        <div
          style={{
            fontSize: "48px",
            opacity: 0.15,
            userSelect: "none",
            filter: `drop-shadow(0 0 20px ${catColor})`,
          }}
        >
          ✦
        </div>
        {/* Category badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 text-xs tracking-wide"
          style={{
            background: catBg,
            border: `1px solid ${catColor}66`,
            color: catColor,
          }}
        >
          {CATEGORY_LABELS[nft.category]}
        </div>
        {/* Rare trait badge */}
        {nft.rareTrait && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 text-xs tracking-wide"
            style={{
              background: "rgba(142,45,226,0.2)",
              border: "1px solid rgba(142,45,226,0.5)",
              color: "rgba(178,102,255,0.9)",
            }}
          >
            ✦ {nft.rareTrait}
          </div>
        )}
        {/* NFT ID */}
        <div
          className="absolute bottom-2 right-2 text-xs font-mono"
          style={{ color: "rgba(255,215,0,0.3)" }}
        >
          #{nft.id.toString()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        {/* Post text */}
        <p
          className="text-sm leading-relaxed line-clamp-2 italic"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          "{nft.postText}"
        </p>

        {/* Creator + WS */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-mono"
            style={{ color: "rgba(255,215,0,0.5)" }}
          >
            @void_{shortCreator}
          </span>
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono"
            style={{
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.2)",
              color: "rgba(255,215,0,0.7)",
            }}
          >
            <Zap size={10} />
            {nft.wisdomScore.toString()} WS
          </div>
        </div>

        {/* Lineage of Light */}
        {nft.lineage.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Lineage:
            </span>
            <div className="flex gap-1">
              {nft.lineage.slice(0, 5).map((resonator) => (
                <div
                  key={resonator}
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: `hsl(${(resonator.length * 37) % 360}, 70%, 50%)`,
                    boxShadow: "0 0 6px currentColor",
                    opacity: 0.7,
                  }}
                  title={resonator}
                />
              ))}
              {nft.lineage.length > 5 && (
                <span
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  +{nft.lineage.length - 5}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Royalty info */}
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 mt-1"
          style={{
            background: "rgba(255,215,0,0.04)",
            border: "1px solid rgba(255,215,0,0.12)",
          }}
        >
          <span className="text-void-gold/40 text-[10px] leading-snug">
            ✦ 3% royalty to creator forever · 1% to VOID team
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex gap-2 p-3 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Resonate */}
        <button
          type="button"
          data-ocid={`nft.secondary_button.${index}`}
          onClick={handleResonate}
          disabled={
            resonating ||
            localResonated ||
            nft.creator.toString() === currentVoidId
          }
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs tracking-wide transition-all disabled:opacity-40"
          style={{
            background: localResonated
              ? "rgba(255,215,0,0.15)"
              : "rgba(255,255,255,0.04)",
            border: localResonated
              ? "1px solid rgba(255,215,0,0.4)"
              : "1px solid rgba(255,255,255,0.1)",
            color: localResonated
              ? "rgba(255,215,0,0.9)"
              : "rgba(255,255,255,0.4)",
          }}
        >
          <Sparkles size={11} />
          Resonate ✦{" "}
          {(Number(nft.resonanceCount) + (localResonated ? 1 : 0)).toString()}
        </button>

        {/* Buy */}
        {nft.isForSale && nft.creator.toString() !== currentVoidId && (
          <button
            type="button"
            data-ocid={`nft.primary_button.${index}`}
            onClick={() => onBuy(nft.id)}
            disabled={buying}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs tracking-wide transition-all disabled:opacity-40"
            style={{
              background: "rgba(255,215,0,0.1)",
              border: "1px solid rgba(255,215,0,0.35)",
              color: "rgba(255,215,0,0.9)",
              boxShadow: "0 0 8px rgba(255,215,0,0.1)",
            }}
          >
            {buying ? <Loader2 size={11} className="animate-spin" /> : null}
            Buy — {nft.priceVoid.toString()} ₮
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sort types ───────────────────────────────────────────────────────────────
type SortBy = "wisdomScore" | "resonance" | "date";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NFTMarketplace() {
  const voidId = useVoidId();
  const [activeCategory, setActiveCategory] = useState<NFTCategory | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<SortBy>("wisdomScore");
  const [showMintModal, setShowMintModal] = useState(false);
  const [resonatingId, setResonatingId] = useState<bigint | null>(null);
  const [buyingId, setBuyingId] = useState<bigint | null>(null);

  const { data: wisdomScore } = useGetWisdomScore(voidId ?? "");
  const score = wisdomScore ? Number(wisdomScore) : 0;
  const canMint = score >= 500;

  const { data: listings = [], isLoading } = useGetMarketplaceListings(
    activeCategory !== "all" ? activeCategory : undefined,
  );
  const { data: myNFTs = [] } = useGetUserNFTs(voidId ?? "");
  const { mutateAsync: resonateNFT } = useResonateNFT();
  const { mutateAsync: buyNFT } = useBuyNFT();

  // Combined: listings + owned (deduplicated)
  const allNFTs = [...listings];
  // Add owned NFTs that aren't in listings
  for (const n of myNFTs) {
    if (!allNFTs.find((x) => x.id === n.id)) {
      allNFTs.push(n);
    }
  }

  // Sort
  const sorted = [...allNFTs].sort((a, b) => {
    if (sortBy === "wisdomScore")
      return Number(b.wisdomScore) - Number(a.wisdomScore);
    if (sortBy === "resonance")
      return Number(b.resonanceCount) - Number(a.resonanceCount);
    return Number(b.mintedAt) - Number(a.mintedAt);
  });

  const handleResonate = async (nftId: bigint) => {
    if (!voidId) return;
    setResonatingId(nftId);
    try {
      await resonateNFT({ nftId, resonatorVoidId: voidId });
    } catch (err) {
      console.error("Resonate error", err);
    } finally {
      setResonatingId(null);
    }
  };

  const handleBuy = async (nftId: bigint) => {
    if (!voidId) return;
    setBuyingId(nftId);
    try {
      await buyNFT({ nftId, buyerVoidId: voidId });
      toast.success("NFT acquired! Your wisdom collection grows ✦");
    } catch (err) {
      console.error("Buy error", err);
      toast.error("Could not complete purchase.");
    } finally {
      setBuyingId(null);
    }
  };

  const FILTER_TABS = [
    { key: "all", label: "All" },
    { key: NFTCategory.lightWisdom, label: "Light Wisdom" },
    { key: NFTCategory.deepShadow, label: "Deep Shadow" },
    { key: NFTCategory.guidedBreathwork, label: "Guided Breathwork" },
    { key: NFTCategory.sageReflection, label: "Sage Reflection" },
  ] as const;

  return (
    <div className="void-bg flex flex-col h-full">
      {/* Header */}
      <div
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,215,0,0.12)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="void-glow-text text-xl font-black tracking-[0.2em]">
              Cosmic Legacy
            </h1>
            <p className="text-white/30 text-xs tracking-widest mt-0.5">
              Eternal Wisdom · ICRC-7 NFTs on ICP
            </p>
          </div>
          {canMint && (
            <button
              type="button"
              data-ocid="nft.mint_button"
              onClick={() => setShowMintModal(true)}
              className="void-btn-primary px-4 py-2.5 text-xs tracking-wider uppercase flex items-center gap-1.5"
              style={{ boxShadow: "0 0 16px rgba(255,215,0,0.15)" }}
            >
              <Sparkles size={13} />
              Mint Wisdom
            </button>
          )}
        </div>

        {/* Mint CTA for eligible users */}
        {canMint && (
          <div
            className="mt-3 px-4 py-2.5 flex items-center gap-3"
            style={{
              background: "rgba(255,215,0,0.06)",
              border: "1px solid rgba(255,215,0,0.2)",
            }}
          >
            <Sparkles size={14} className="text-void-gold/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-void-gold/80 text-xs font-semibold">
                Your wisdom qualifies for minting!
              </span>
              <span className="text-white/40 text-xs ml-2">
                ({score} WS — threshold: 500)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMintModal(true)}
              className="shrink-0 text-void-gold/60 hover:text-void-gold text-xs tracking-wide transition-colors"
            >
              Mint Now →
            </button>
          </div>
        )}
      </div>

      {/* Category Filter + Sort */}
      <div
        className="shrink-0 px-4 py-2.5 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,215,0,0.06)" }}
      >
        {/* Category tabs — scrollable */}
        <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0">
          {FILTER_TABS.map(({ key, label }) => {
            const isActive = activeCategory === key;
            const catColor =
              key !== "all"
                ? CATEGORY_COLORS[key as NFTCategory]
                : "rgba(255,215,0,0.8)";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(key as NFTCategory | "all")}
                className="shrink-0 px-3 py-1.5 text-xs tracking-wide transition-all"
                style={{
                  background: isActive
                    ? key !== "all"
                      ? CATEGORY_BG[key as NFTCategory]
                      : "rgba(255,215,0,0.1)"
                    : "rgba(255,255,255,0.03)",
                  border: isActive
                    ? `1px solid ${catColor}`
                    : "1px solid rgba(255,255,255,0.08)",
                  color: isActive ? catColor : "rgba(255,255,255,0.35)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="shrink-0 bg-void-black/50 border border-void-gold/15 text-white/50 text-xs px-2 py-1.5 focus:outline-none focus:border-void-gold/40 transition-colors"
        >
          <option value="wisdomScore">By WS</option>
          <option value="resonance">By Resonance</option>
          <option value="date">By Date</option>
        </select>
      </div>

      {/* NFT Gallery */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading && (
          <div
            data-ocid="nft.loading_state"
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <Loader2 size={24} className="text-void-gold/40 animate-spin" />
            <p className="text-white/30 text-sm">
              Retrieving eternal artifacts...
            </p>
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div
            data-ocid="nft.empty_state"
            className="flex flex-col items-center justify-center py-16 text-center gap-4 px-6"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,215,0,0.1), rgba(142,45,226,0.08))",
                border: "1px solid rgba(255,215,0,0.15)",
              }}
            >
              <Sparkles size={24} className="text-void-gold/40" />
            </div>
            <div>
              <p className="text-white/40 text-sm mb-1">
                The cosmic gallery awaits its first artifacts.
              </p>
              {canMint ? (
                <button
                  type="button"
                  onClick={() => setShowMintModal(true)}
                  className="text-void-gold/60 hover:text-void-gold text-xs tracking-wide transition-colors"
                >
                  Be the first to mint your wisdom →
                </button>
              ) : (
                <p className="text-white/25 text-xs">
                  Reach 500 Wisdom Score in the rooms to mint your first NFT.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((nft, idx) => (
            <NFTCard
              key={nft.id.toString()}
              nft={nft}
              currentVoidId={voidId ?? ""}
              onResonate={handleResonate}
              onBuy={handleBuy}
              resonating={resonatingId === nft.id}
              buying={buyingId === nft.id}
              index={idx + 1}
            />
          ))}
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && voidId && (
        <MintModal
          wisdomScore={score}
          creatorVoidId={voidId}
          onClose={() => setShowMintModal(false)}
        />
      )}
    </div>
  );
}
