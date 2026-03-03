/**
 * ValueOfferings — Give first, receive effortlessly.
 * A marketplace for wisdom, breathwork, 1:1 sessions, and art.
 */
import { Loader2, Plus, X, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OfferingType, type ValueOffering } from "../backend";
import {
  useCreateValueOffering,
  useDeactivateOffering,
  useGetOfferingsByCreator,
  useGetValueOfferings,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";

// ─── Offering type labels + styles ───────────────────────────────────────────
const TYPE_LABELS: Record<OfferingType, string> = {
  [OfferingType.oneOnOne]: "1:1 Session",
  [OfferingType.breathwork]: "Breathwork",
  [OfferingType.wisdom]: "Wisdom",
  [OfferingType.art]: "Art",
};

const TYPE_ICONS: Record<OfferingType, string> = {
  [OfferingType.oneOnOne]: "🌀",
  [OfferingType.breathwork]: "🌬️",
  [OfferingType.wisdom]: "✦",
  [OfferingType.art]: "🎨",
};

const TYPE_COLORS: Record<OfferingType, string> = {
  [OfferingType.oneOnOne]: "rgba(255,215,0,0.8)",
  [OfferingType.breathwork]: "rgba(100,200,255,0.8)",
  [OfferingType.wisdom]: "rgba(200,200,255,0.8)",
  [OfferingType.art]: "rgba(255,150,200,0.8)",
};

// ─── Create Offering Modal ────────────────────────────────────────────────────
interface CreateModalProps {
  creatorVoidId: string;
  onClose: () => void;
}

function CreateOfferingModal({ creatorVoidId, onClose }: CreateModalProps) {
  const { mutateAsync: createOffering, isPending } = useCreateValueOffering();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<OfferingType>(OfferingType.wisdom);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    const priceNum = Number.parseInt(price) || 0;
    try {
      await createOffering({
        title: title.trim(),
        description: description.trim(),
        priceVoid: priceNum,
        offeringType: type,
        creatorVoidId,
      });
      toast.success("Value offering created! ✦");
      onClose();
    } catch (err) {
      console.error("Create offering error", err);
      toast.error("Could not create offering. Try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      <div
        className="w-full max-w-md mx-4 p-6 overflow-y-auto max-h-[90vh]"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,0,21,0.98), rgba(0,0,0,0.98))",
          border: "1px solid rgba(255,215,0,0.2)",
          boxShadow: "0 0 40px rgba(255,215,0,0.1)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-void-gold font-bold tracking-wider text-lg">
              Create Offering ✦
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              Give first. Receive effortlessly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <p className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2">
              Offering Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(OfferingType).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="px-3 py-2.5 text-xs tracking-wide transition-all text-left flex items-center gap-2"
                  style={{
                    background:
                      type === t
                        ? "rgba(255,215,0,0.08)"
                        : "rgba(255,255,255,0.03)",
                    border:
                      type === t
                        ? `1px solid ${TYPE_COLORS[t]}`
                        : "1px solid rgba(255,255,255,0.1)",
                    color:
                      type === t ? TYPE_COLORS[t] : "rgba(255,255,255,0.4)",
                  }}
                >
                  <span>{TYPE_ICONS[t]}</span>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="offering-title"
              className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
            >
              Title
            </label>
            <input
              id="offering-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you offering?"
              maxLength={80}
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="offering-description"
              className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
            >
              Description
            </label>
            <textarea
              id="offering-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the value you're offering in depth..."
              rows={3}
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="offering-price"
              className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
            >
              Price (VOID Tokens){" "}
              <span className="text-white/20 normal-case">
                (0 = free offering)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="offering-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="flex-1 bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors"
              />
              <span className="text-void-gold/60 text-lg font-mono shrink-0">
                ₮
              </span>
            </div>
          </div>

          <p className="text-white/25 text-xs leading-relaxed">
            "Serve deeply → abundance follows. Give enormous value first and
            tokens, legacy, and connection flow to you effortlessly."
          </p>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !title.trim() || !description.trim()}
            className="void-btn-primary w-full py-3.5 text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {isPending ? "Creating..." : "Offer to the Cosmos"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Offering Card ────────────────────────────────────────────────────────────
interface OfferingCardProps {
  offering: ValueOffering;
  isOwn: boolean;
  onDeactivate?: (id: string) => void;
  deactivating?: boolean;
}

function OfferingCard({
  offering,
  isOwn,
  onDeactivate,
  deactivating,
}: OfferingCardProps) {
  const typeColor = TYPE_COLORS[offering.offeringType];
  const shortCreator = offering.creatorVoidId
    .replace("@void_shadow_", "")
    .replace(":canister", "")
    .slice(0, 8);

  return (
    <div
      className="flex flex-col transition-all"
      style={{
        background: "rgba(10,0,21,0.8)",
        border: `1px solid ${typeColor}33`,
        boxShadow: `0 0 12px ${typeColor}11`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          borderBottom: `1px solid ${typeColor}22`,
          background: `${typeColor}08`,
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "16px" }}>
            {TYPE_ICONS[offering.offeringType]}
          </span>
          <span
            className="text-xs tracking-wide px-2 py-0.5"
            style={{
              background: `${typeColor}15`,
              border: `1px solid ${typeColor}44`,
              color: typeColor,
            }}
          >
            {TYPE_LABELS[offering.offeringType]}
          </span>
        </div>
        {offering.priceVoid > BigInt(0) ? (
          <div
            className="flex items-center gap-1 font-mono text-sm font-bold"
            style={{ color: "rgba(255,215,0,0.8)" }}
          >
            <Zap size={12} />
            {offering.priceVoid.toString()} ₮
          </div>
        ) : (
          <span
            className="text-xs tracking-wide px-2 py-0.5"
            style={{
              background: "rgba(100,255,100,0.08)",
              border: "1px solid rgba(100,255,100,0.2)",
              color: "rgba(100,255,150,0.7)",
            }}
          >
            FREE
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-4">
        <h3 className="text-white/90 font-semibold text-sm mb-2 leading-tight">
          {offering.title}
        </h3>
        <p className="text-white/45 text-xs leading-relaxed line-clamp-3">
          {offering.description}
        </p>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span
          className="text-xs font-mono"
          style={{ color: "rgba(255,215,0,0.4)" }}
        >
          @void_{shortCreator}
        </span>
        {isOwn ? (
          <button
            type="button"
            onClick={() => onDeactivate?.(offering.id)}
            disabled={deactivating || !offering.isActive}
            className="text-xs px-3 py-1.5 transition-all disabled:opacity-40"
            style={{
              background: "rgba(255,80,80,0.06)",
              border: "1px solid rgba(255,80,80,0.2)",
              color: "rgba(255,100,100,0.7)",
            }}
          >
            {deactivating
              ? "Closing..."
              : offering.isActive
                ? "Deactivate"
                : "Inactive"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              toast.info(
                "Exchange initiated — connect via Messages to proceed.",
              );
            }}
            className="text-xs px-3 py-1.5 transition-all"
            style={{
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.3)",
              color: "rgba(255,215,0,0.8)",
            }}
          >
            Book / Exchange
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ValueOfferings() {
  const voidId = useVoidId();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const { data: allOfferings = [], isLoading } = useGetValueOfferings();
  const { data: myOfferings = [] } = useGetOfferingsByCreator(voidId ?? "");
  const { mutateAsync: deactivate } = useDeactivateOffering();

  const activeOfferings = allOfferings.filter((o) => o.isActive);

  const handleDeactivate = async (offeringId: string) => {
    if (!voidId) return;
    setDeactivatingId(offeringId);
    try {
      await deactivate({ offeringId, callerVoidId: voidId });
      toast.success("Offering deactivated.");
    } catch (err) {
      console.error("Deactivate error", err);
      toast.error("Could not deactivate offering.");
    } finally {
      setDeactivatingId(null);
    }
  };

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
              Value Offerings ✦
            </h1>
            <p className="text-white/30 text-xs tracking-widest mt-0.5">
              Give first. Receive effortlessly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="void-btn-primary px-4 py-2.5 text-xs tracking-wider uppercase flex items-center gap-1.5"
          >
            <Plus size={13} />
            Offer Value
          </button>
        </div>

        {/* Philosophy quote */}
        <div
          className="mt-3 px-4 py-3"
          style={{
            background: "rgba(255,215,0,0.04)",
            border: "1px solid rgba(255,215,0,0.1)",
          }}
        >
          <p className="text-white/40 text-xs italic leading-relaxed text-center">
            "Serve deeply → abundance follows. The more you give without
            expectation, the more the cosmos returns to you."
          </p>
        </div>
      </div>

      {/* Offerings */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* My Offerings section */}
        {myOfferings.length > 0 && (
          <div>
            <h2 className="text-void-gold/60 text-xs uppercase tracking-widest mb-3">
              My Offerings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myOfferings.map((offering) => (
                <OfferingCard
                  key={offering.id}
                  offering={offering}
                  isOwn
                  onDeactivate={handleDeactivate}
                  deactivating={deactivatingId === offering.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* All active offerings */}
        <div>
          <h2 className="text-white/30 text-xs uppercase tracking-widest mb-3">
            Cosmic Marketplace
          </h2>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="text-void-gold/40 animate-spin" />
            </div>
          )}

          {!isLoading && activeOfferings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3 px-6">
              <span style={{ fontSize: "32px", opacity: 0.4 }}>✦</span>
              <p className="text-white/30 text-sm">
                No offerings yet. Be the first to give value.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="text-void-gold/60 hover:text-void-gold text-xs tracking-wide transition-colors mt-2"
              >
                Create the first offering →
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeOfferings.map((offering) => (
              <OfferingCard
                key={offering.id}
                offering={offering}
                isOwn={offering.creatorVoidId === voidId}
                onDeactivate={handleDeactivate}
                deactivating={deactivatingId === offering.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && voidId && (
        <CreateOfferingModal
          creatorVoidId={voidId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
