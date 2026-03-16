import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const OMNISM_PROMPTS = [
  "What truth have you been avoiding in the light?",
  "Which illusion still comforts you in the dark?",
  "Where does your silence speak louder than words?",
  "What would you say if no one could judge you?",
  "Which belief do you hold that you have never questioned?",
  "What does the void reveal when you stop filling it?",
  "Who are you when no one is watching?",
  "Which of your beliefs were given to you, and which did you choose?",
  "Where does illusion end and reality begin?",
  "What would you do if there were no consequences and no reward?",
  "What truth are you most afraid to share with the world?",
];

// ─── Daily Inner Engineering Pulse — 7 questions by day of week ──────────────
const INNER_ENGINEERING_PULSE: Record<number, string> = {
  1: "What illusion have you dissolved this week?", // Monday
  2: "Where does truth feel uncomfortable in your life right now?", // Tuesday
  3: "What would you do if wisdom were your only currency?", // Wednesday
  4: "Who are you without your story?", // Thursday
  5: "What part of your shadow is asking to be integrated?", // Friday
  6: "What does your highest self know that your ego denies?", // Saturday
  0: "How have you given value to the world without expecting return?", // Sunday
};

function getDailyPulse(): string {
  const day = new Date().getDay();
  return INNER_ENGINEERING_PULSE[day];
}

function getDailyPrompt(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return OMNISM_PROMPTS[dayOfYear % OMNISM_PROMPTS.length];
}

export default function SplashScreen() {
  const { login, isLoggingIn } = useInternetIdentity();
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-y-auto overflow-x-hidden flex flex-col items-center">
      {/* Sacred geometry decorative rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full border border-void-gold/4 absolute" />
        <div className="w-[500px] h-[500px] rounded-full border border-void-gold/6 absolute" />
        <div className="w-[280px] h-[280px] rounded-full border border-void-gold/8 absolute" />
        <div className="w-[140px] h-[140px] rounded-full border border-void-gold/12 absolute" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-xl mx-auto pt-16 pb-12 w-full">
        {/* Floating Logo */}
        <div
          className="mb-8 relative"
          style={{ animation: "logoFloat 4s ease-in-out infinite" }}
        >
          <img
            src="/assets/uploads/void-2.o-1.png"
            alt="VOID"
            className="w-28 h-28 mx-auto drop-shadow-[0_0_40px_rgba(255,215,0,0.7)]"
          />
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow:
                "0 0 60px rgba(255,215,0,0.15), 0 0 30px rgba(142,45,226,0.2)",
            }}
          />
        </div>

        {/* Hero Title */}
        <h1
          className="void-glow-text font-black tracking-[0.3em] mb-3 uppercase"
          style={{ fontSize: "clamp(3rem, 10vw, 5rem)" }}
        >
          VOID
        </h1>

        {/* Tagline */}
        <p className="text-white text-xl font-light tracking-wide mb-6">
          Your Safe Cosmic Temple
        </p>

        {/* Friendly description */}
        <div
          className="mb-6 px-6 py-5 max-w-md w-full text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,215,0,0.06), rgba(142,45,226,0.04))",
            border: "1px solid rgba(255,215,0,0.15)",
          }}
        >
          <p className="text-white/80 text-base leading-relaxed">
            VOID is a safe free cosmic temple where you can share your thoughts,
            wisdom and feelings with others{" "}
            <span className="text-void-gold font-semibold">privately.</span>
          </p>
          <p className="text-white/55 text-sm mt-3 leading-relaxed">
            No ads, no spying, just good people growing together.
          </p>
        </div>

        {/* Urgency note */}
        <p
          className="text-sm italic mb-8 max-w-sm"
          style={{ color: "rgba(255,215,0,0.65)" }}
        >
          It might cost money later. Join now while it is{" "}
          <span className="font-semibold">completely free forever!</span>
        </p>

        {/* Enter the Void button */}
        <button
          type="button"
          data-ocid="landing.enter_button"
          onClick={login}
          disabled={isLoggingIn}
          className="w-full max-w-sm py-5 text-sm tracking-[0.3em] uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed mb-4 relative overflow-hidden transition-all"
          style={{
            background: isLoggingIn
              ? "rgba(255,215,0,0.08)"
              : "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(218,165,32,0.12))",
            border: "1px solid rgba(255,215,0,0.5)",
            color: "#FFD700",
            boxShadow: isLoggingIn
              ? "none"
              : "0 0 30px rgba(255,215,0,0.25), 0 0 60px rgba(255,215,0,0.1), inset 0 0 30px rgba(255,215,0,0.05)",
          }}
        >
          {/* Shimmer effect */}
          {!isLoggingIn && (
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.15) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "gold-shimmer 3s linear infinite",
              }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isLoggingIn ? (
              <>
                <span className="w-4 h-4 border-2 border-void-gold/30 border-t-void-gold rounded-full animate-spin" />
                Entering the Void...
              </>
            ) : (
              "✦ Enter the Void ✦"
            )}
          </span>
        </button>

        {/* Learn More toggle */}
        <button
          type="button"
          data-ocid="splash.secondary_button"
          onClick={() => setLearnMoreOpen(!learnMoreOpen)}
          className="text-white/40 text-sm hover:text-void-gold/70 transition-colors tracking-wider mb-8"
        >
          {learnMoreOpen ? "▲ Hide details" : "▼ Learn more"}
        </button>

        {/* Learn More expandable section */}
        <div
          style={{
            maxHeight: learnMoreOpen ? "600px" : "0px",
            overflow: "hidden",
            transition: "max-height 0.4s ease",
          }}
        >
          <div className="w-full max-w-md mb-8">
            <div
              className="px-6 py-5 text-left space-y-4"
              style={{
                background: "rgba(10,0,21,0.8)",
                border: "1px solid rgba(142,45,226,0.2)",
              }}
            >
              <h2 className="text-void-gold text-sm uppercase tracking-[0.3em] font-bold mb-4">
                What is VOID?
              </h2>
              {[
                {
                  icon: "🔒",
                  title: "Private & Encrypted",
                  desc: "All your private messages are encrypted on your device. No one — not even the app — can read them.",
                },
                {
                  icon: "🚫",
                  title: "Zero Ads, Ever",
                  desc: "VOID will never show you ads or sell your data. Your attention is sacred.",
                },
                {
                  icon: "🌑",
                  title: "Anonymous by Default",
                  desc: "Join with no email or phone number. You get a private VOID ID. No one knows who you are unless you choose.",
                },
                {
                  icon: "🌐",
                  title: "Built on Internet Computer",
                  desc: "Powered by ICP — the world's most private blockchain. No central server can be shut down or spied on.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 items-start">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="text-void-gold/80 text-sm font-semibold mb-0.5">
                      {item.title}
                    </div>
                    <div className="text-white/50 text-xs leading-relaxed">
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Room preview cards */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
          <div className="room-card-light p-4 text-center">
            <div className="text-3xl mb-2">☀️</div>
            <div className="text-void-gold font-semibold text-sm tracking-wider">
              LIGHT ROOM
            </div>
            <div className="text-white/40 text-xs mt-1">Wisdom & Truth</div>
            <div className="text-white/25 text-xs mt-1">Public · Open</div>
          </div>
          <div className="room-card-dark p-4 text-center">
            <div className="text-3xl mb-2">🌑</div>
            <div className="text-void-purple font-semibold text-sm tracking-wider">
              DARK ROOM
            </div>
            <div className="text-white/40 text-xs mt-1">Illusion & Shadow</div>
            <div className="text-white/25 text-xs mt-1">Public · Open</div>
          </div>
        </div>

        {/* Daily Inner Engineering Pulse */}
        <div
          className="mb-4 w-full max-w-md px-5 py-4 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(142,45,226,0.08), rgba(74,0,255,0.05))",
            border: "1px solid rgba(142,45,226,0.25)",
          }}
        >
          <p className="text-void-purple/60 text-xs uppercase tracking-[0.3em] mb-2">
            ✦ Daily Inner Engineering Pulse
          </p>
          <p className="text-white/70 text-sm italic leading-relaxed">
            "{getDailyPulse()}"
          </p>
        </div>

        {/* Daily Omnism Prompt */}
        <div className="mb-10 px-6 py-4 border border-void-gold/20 bg-void-gold/5 backdrop-blur-sm w-full max-w-md">
          <p className="text-void-gold/50 text-xs uppercase tracking-widest mb-2">
            Daily Reflection
          </p>
          <p className="text-white/80 text-sm italic leading-relaxed">
            "{getDailyPrompt()}"
          </p>
        </div>

        {/* Trust line */}
        <p className="text-white/20 text-xs mb-2">
          Secured by Internet Identity · Zero knowledge · No email required
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 pb-6 text-center w-full">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} VOID · Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || "void-app")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-void-gold/40 hover:text-void-gold/70 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
