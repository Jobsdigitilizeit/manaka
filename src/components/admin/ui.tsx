import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound, X } from 'lucide-react';
import { validatePassword } from '../../utils/validation';

export type Notify = (text: string, type?: 'success' | 'info' | 'error') => void;

export const field =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500';
export const label = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1';
export const btnPrimary =
  'px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer';
export const btnDanger =
  'px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer';
export const btnGhost =
  'px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer';

export const Modal: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  width?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, onClose, width = 'max-w-lg', children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white border border-slate-200 rounded-3xl ${width} w-full p-6 sm:p-7 text-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {icon && <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">{icon}</div>}
          <div>
            <h3 className="text-base font-black text-slate-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const Badge: React.FC<{ tone: 'green' | 'red' | 'amber' | 'slate' | 'blue'; children: React.ReactNode }> = ({ tone, children }) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    red: 'bg-rose-50 text-rose-800 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
};

export const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label = 'Copy' }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        } catch {
          /* clipboard blocked - the value is still visible to select manually */
        }
      }}
      className={btnGhost}
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{done ? 'Copied' : label}</span>
    </button>
  );
};

/** Shown once after an administrator creates an account or resets a password. */
export const CredentialModal: React.FC<{
  heading: string;
  accountName: string;
  email: string;
  password: string;
  onClose: () => void;
}> = ({ heading, accountName, email, password, onClose }) => (
  <Modal title={heading} subtitle={`${accountName} (${email})`} icon={<KeyRound className="w-5 h-5" />} onClose={onClose}>
    <div className="space-y-4 text-xs">
      <div className="bg-slate-900 rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Temporary password</div>
        <div className="font-mono text-lg text-amber-300 font-bold break-all select-all" data-testid="issued-password">{password}</div>
      </div>
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          This password is shown <strong>only once</strong> and is not stored in readable form. Share it through a secure channel. The user will be required to choose a new password the first time they sign in.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <CopyButton value={password} label="Copy password" />
        <button onClick={onClose} className={btnPrimary}>Done</button>
      </div>
    </div>
  </Modal>
);

/** Password entry for admin-set credentials, with the same live rules users see. */
export const PasswordChooser: React.FC<{
  mode: 'generate' | 'manual';
  onModeChange: (m: 'generate' | 'manual') => void;
  value: string;
  onChange: (v: string) => void;
}> = ({ mode, onModeChange, value, onChange }) => {
  const v = validatePassword(value);
  return (
    <div className="space-y-2">
      <span className={label}>Password</span>
      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
        {(['generate', 'manual'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`py-2 rounded-xl border cursor-pointer transition-colors ${mode === m ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {m === 'generate' ? 'Generate securely' : 'Set manually'}
          </button>
        ))}
      </div>
      {mode === 'manual' && (
        <>
          <input type="text" autoComplete="off" value={value} onChange={e => onChange(e.target.value)} placeholder="Enter a temporary password" className={`${field} font-mono`} />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            {([
              [v.rules.minLength, '10+ characters'],
              [v.rules.hasUpper, 'Uppercase'],
              [v.rules.hasLower, 'Lowercase'],
              [v.rules.hasNumber, 'Number'],
              [v.rules.hasSpecial, 'Special character'],
            ] as Array<[boolean, string]>).map(([ok, text]) => (
              <li key={text} className={ok ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{ok ? '✓' : '○'} {text}</li>
            ))}
          </ul>
        </>
      )}
      {mode === 'generate' && <p className="text-[11px] text-slate-500">A random 12-character password that meets the policy will be created.</p>}
    </div>
  );
};

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center py-12 text-slate-400 text-xs font-semibold">{children}</div>
);

export const formatWhen = (value?: string) => (value ? value.slice(0, 16).replace('T', ' ') : '-');
