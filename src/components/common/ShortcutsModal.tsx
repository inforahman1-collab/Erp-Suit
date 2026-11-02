import React from 'react';
import { Keyboard, X } from 'lucide-react';

export const ShortcutsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', desc: 'Display keyboard shortcuts guide' },
    { key: 'F2', desc: 'Open Quick POS Billing terminal' },
    { key: 'F3', desc: 'Open New Double-Entry Voucher modal' },
    { key: 'F4', desc: 'Jump to Inventory & Products' },
    { key: 'F8', desc: 'Complete tender / Cash sale' },
    { key: 'F9', desc: 'Print active invoice or voucher' },
    { key: 'Esc', desc: 'Close any active modal or return' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Desktop Keyboard Shortcuts
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700 py-3 text-xs">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="py-2.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 font-medium">{sc.desc}</span>
              <kbd className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px] shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
