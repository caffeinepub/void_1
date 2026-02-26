import { useAvatar } from '../hooks/useAvatar';

interface VoidAvatarProps {
  voidId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** If provided, renders a custom photo instead of the generated cosmic avatar */
  customAvatarUrl?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
};

const GLOW_MAP = {
  sm: 'shadow-[0_0_8px_rgba(255,215,0,0.25)]',
  md: 'shadow-[0_0_12px_rgba(255,215,0,0.3)]',
  lg: 'shadow-[0_0_20px_rgba(255,215,0,0.4)]',
};

export default function VoidAvatar({
  voidId,
  size = 'md',
  className = '',
  customAvatarUrl,
}: VoidAvatarProps) {
  const generatedUrl = useAvatar(voidId);
  const src = customAvatarUrl ?? generatedUrl;

  return (
    <img
      src={src}
      alt={voidId}
      className={`rounded-full border border-void-gold/30 object-cover ${SIZE_MAP[size]} ${GLOW_MAP[size]} ${className}`}
    />
  );
}
