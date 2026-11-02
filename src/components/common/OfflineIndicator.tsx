import React, { useEffect, useState } from 'react';
import { WifiOff, Database } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>অফলাইন মোড চালু (Offline Mode) — স্থানীয় স্টোরেজে ডেটা সুরক্ষিতভাবে সংরক্ষিত হচ্ছে</span>
    </div>
  );
};
