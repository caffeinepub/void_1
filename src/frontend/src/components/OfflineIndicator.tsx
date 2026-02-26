import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-void-black/95 border-b border-red-500/30 px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff size={14} className="text-red-400" />
      <span className="text-red-400 text-xs tracking-widest uppercase">
        Offline — Viewing cached messages
      </span>
    </div>
  );
}
