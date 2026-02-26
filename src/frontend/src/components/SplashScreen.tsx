import { useInternetIdentity } from '../hooks/useInternetIdentity';

const OMNISM_PROMPTS = [
  'What truth have you been avoiding in the light?',
  'Which illusion still comforts you in the dark?',
  'Where does your silence speak louder than words?',
  'What would you say if no one could judge you?',
  'Which belief do you hold that you have never questioned?',
  'What does the void reveal when you stop filling it?',
  'Who are you when no one is watching?',
];

function getDailyPrompt(): string {
  const dayOfWeek = new Date().getDay();
  return OMNISM_PROMPTS[dayOfWeek];
}

export default function SplashScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/generated/void-splash-bg.dim_1440x900.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-void-black/60 via-void-deep/80 to-void-black/95" />

      {/* Sacred geometry decorative rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full border border-void-gold/5 absolute" />
        <div className="w-[400px] h-[400px] rounded-full border border-void-gold/8 absolute" />
        <div className="w-[200px] h-[200px] rounded-full border border-void-gold/10 absolute" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-6 relative">
          <img
            src="/assets/generated/void-logo.dim_256x256.png"
            alt="VOID"
            className="w-24 h-24 mx-auto drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]"
          />
        </div>

        {/* Title */}
        <h1 className="void-glow-text text-7xl font-black tracking-[0.3em] mb-2 uppercase">
          VOID
        </h1>
        <p className="text-void-gold/40 text-xs tracking-[0.5em] uppercase mb-8">
          The Sanctuary of Truth
        </p>

        {/* Manifesto */}
        <div className="mb-8 space-y-1">
          <p className="text-void-gold/80 text-lg font-light italic tracking-wide">
            "Light is truth. Dark is illusion."
          </p>
          <p className="text-white/40 text-sm tracking-wider">
            No tracking. No ads. No noise. Only the void.
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

        {/* Room Cards */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-10">
          <div className="room-card-light p-4 text-center">
            <div className="text-2xl mb-2">☀️</div>
            <div className="text-void-gold font-semibold text-sm tracking-wider">LIGHT ROOM</div>
            <div className="text-white/40 text-xs mt-1">Wisdom & Truth</div>
          </div>
          <div className="room-card-dark p-4 text-center">
            <div className="text-2xl mb-2">🌑</div>
            <div className="text-void-purple font-semibold text-sm tracking-wider">DARK ROOM</div>
            <div className="text-white/40 text-xs mt-1">Illusion & Shadow</div>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={login}
          disabled={isLoggingIn}
          className="void-btn-primary w-full max-w-md py-4 text-sm tracking-[0.3em] uppercase font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-void-gold/30 border-t-void-gold rounded-full animate-spin" />
              Entering the Void...
            </span>
          ) : (
            'Enter the Void'
          )}
        </button>

        <p className="mt-4 text-white/20 text-xs">
          Secured by Internet Identity · Zero knowledge · No email required
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto pb-6 text-center">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} VOID · Built with ♥ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'void-app')}`}
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
