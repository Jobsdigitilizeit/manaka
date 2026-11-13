import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, Mail, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { api, AuthResult } from '../services/api';
import { AuthRole } from '../types';
import { validateEmail, validatePassword } from '../utils/validation';

const inputCls =
  'w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 placeholder-slate-400';
const primaryBtn =
  'px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors';
const ghostBtn = 'px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm cursor-pointer';

const Shell: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; onClose?: () => void; children: React.ReactNode }> = ({
  title, subtitle, icon, onClose, children,
}) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 text-slate-900 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">{icon}</div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      {children}
    </div>
  </div>
);

const ErrorBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-start gap-2">
    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

/** Live checklist for the password policy. */
export const PasswordRules: React.FC<{ password: string }> = ({ password }) => {
  const v = validatePassword(password);
  const rules: Array<[boolean, string]> = [
    [v.rules.minLength, '10+ characters'],
    [v.rules.hasUpper, 'Uppercase letter'],
    [v.rules.hasLower, 'Lowercase letter'],
    [v.rules.hasNumber, 'Number'],
    [v.rules.hasSpecial, 'Special character'],
  ];
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mt-2" aria-label="Password requirements">
      {rules.map(([ok, label]) => (
        <li key={label} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-slate-400'}`}>
          {ok ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block" />}
          {label}
        </li>
      ))}
    </ul>
  );
};

const PasswordField: React.FC<{
  label: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string; showRules?: boolean;
}> = ({ label, value, onChange, autoComplete, placeholder, showRules }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block font-semibold text-slate-700 mb-1.5 text-xs">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className={`${inputCls} pr-10`}
        />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {showRules && <PasswordRules password={value} />}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Email confirmation                                                        */
/* -------------------------------------------------------------------------- */

export const VerifyEmailModal: React.FC<{
  accountType: AuthRole;
  email: string;
  onClose: () => void;
}> = ({ accountType, email, onClose }) => {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await api.resendVerification(accountType, email);
      setInfo('A new confirmation link has been sent. Check your inbox and spam folder.');
      setCooldown(30);
    } catch {
      setError('Could not resend the link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Confirm your email" subtitle="One last step to activate your account" icon={<Mail className="w-5 h-5" />} onClose={onClose}>
      <p className="text-sm text-slate-600 leading-relaxed">
        We sent a confirmation link to <strong className="text-slate-900">{email}</strong>. Open it from your inbox to activate your account. The link expires in 15 minutes.
      </p>
      {error && <ErrorBox>{error}</ErrorBox>}
      {info && <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{info}</p>}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={resend} disabled={cooldown > 0 || busy} className="text-sm font-semibold text-emerald-700 hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer">
          {busy ? 'Sending...' : cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend confirmation link'}
        </button>
        <button type="button" onClick={onClose} className={primaryBtn}>Done</button>
      </div>
    </Shell>
  );
};

export const VerifyEmailPage: React.FC<{ onVerified: (result: AuthResult) => void }> = ({ onVerified }) => {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (!token) return setError('This confirmation link is incomplete. Request a new link by signing in.');
    setBusy(true);
    setError('');
    try {
      const result = await api.confirmEmail(token);
      if (!result.success || !result.token) return setError(result.error || 'This confirmation link is invalid or expired. Request a new one by signing in.');
      window.history.replaceState({}, '', '/');
      onVerified(result);
    } catch {
      setError('Could not reach Skillix. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg space-y-5 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Mail className="w-6 h-6" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Confirm your Skillix email</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Confirm this address to activate your account and continue to Skillix.</p>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <button type="button" onClick={confirm} disabled={busy || !token} className={`${primaryBtn} w-full`}>
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {busy ? 'Confirming...' : 'Confirm email address'}
        </button>
      </section>
    </main>
  );
};

/* -------------------------------------------------------------------------- */
/*  Forgot / reset password                                                    */
/* -------------------------------------------------------------------------- */

export const ForgotPasswordModal: React.FC<{
  accountType: AuthRole | 'any';
  defaultEmail?: string;
  onClose: () => void;
}> = ({ accountType, defaultEmail = '', onClose }) => {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const check = validateEmail(email);
    if (!check.isValid) return setError(check.error || 'Enter a valid email address.');
    setBusy(true);
    try {
      const res = await api.forgotPassword(accountType, email.trim());
      if ((res as any).httpStatus === 429) return setError(res.error || 'Too many requests. Please wait and try again.');
      if ((res as any).httpStatus >= 400 || !res.success) {
        return setError(res.error || 'We could not send the reset code right now. Please try again later.');
      }
      setDevCode(res.devCode);
      setStep('reset');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email.');
    if (!validatePassword(password).isValid) return setError('Please meet all password requirements.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const res = await api.resetPassword(accountType, email.trim(), code, password);
      if (res.success) setStep('done');
      else setError(res.error || 'Could not reset password.');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Reset your password" subtitle={step === 'request' ? "We'll email you a one-time code" : step === 'reset' ? 'Enter the code and choose a new password' : undefined} icon={<KeyRound className="w-5 h-5" />} onClose={onClose}>
      {step === 'request' && (
        <form onSubmit={request} className="space-y-4">
          <div>
            <label htmlFor="fp-email" className="block font-semibold text-slate-700 mb-1.5 text-xs">Account email address</label>
            <input id="fp-email" type="email" required autoFocus autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="name@example.co.za" className={inputCls} />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{busy ? 'Sending...' : 'Send reset code'}</span>
            </button>
          </div>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={reset} className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            If an account exists for <strong className="text-slate-900">{email}</strong>, a 6-digit code is on its way. It expires in 15 minutes.
          </p>
          {devCode && <DevCodeNotice code={devCode} />}
          <div>
            <label htmlFor="fp-code" className="block font-semibold text-slate-700 mb-1.5 text-xs">Reset code</label>
            <input id="fp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="000000" className={`${inputCls} text-center text-xl font-mono tracking-[0.4em]`} autoFocus />
          </div>
          <PasswordField label="New password" value={password} onChange={v => { setPassword(v); setError(''); }} autoComplete="new-password" showRules />
          <PasswordField label="Confirm new password" value={confirm} onChange={v => { setConfirm(v); setError(''); }} autoComplete="new-password" />
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="flex justify-between gap-2">
            <button type="button" onClick={() => { setStep('request'); setError(''); }} className={ghostBtn}>Back</button>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{busy ? 'Updating...' : 'Update password'}</span>
            </button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <p className="text-base text-slate-900 font-semibold">Your password has been updated.</p>
          <p className="text-sm text-slate-500">For your security you've been signed out everywhere. Sign in with your new password.</p>
          <button onClick={onClose} className={`${primaryBtn} w-full`}>Back to sign in</button>
        </div>
      )}
    </Shell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Change password (voluntary, or forced after an admin-issued password)       */
/* -------------------------------------------------------------------------- */

export const ChangePasswordModal: React.FC<{
  forced?: boolean;
  onChanged: () => void;
  onClose?: () => void;
}> = ({ forced, onChanged, onClose }) => {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validatePassword(password).isValid) return setError('Please meet all password requirements.');
    if (password !== confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      const res = await api.changePassword(current, password);
      if (res.success) onChanged();
      else setError(res.error || 'Could not change password.');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={forced ? 'Choose a new password' : 'Change password'}
      subtitle={forced ? 'Your administrator issued a temporary password' : 'Other devices will be signed out'}
      icon={<KeyRound className="w-5 h-5" />}
      onClose={forced ? undefined : onClose}
    >
      {forced && (
        <p className="text-sm text-slate-600 leading-relaxed">
          For your security you must replace the temporary password before continuing.
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <PasswordField label={forced ? 'Temporary password' : 'Current password'} value={current} onChange={v => { setCurrent(v); setError(''); }} autoComplete="current-password" />
        <PasswordField label="New password" value={password} onChange={v => { setPassword(v); setError(''); }} autoComplete="new-password" showRules />
        <PasswordField label="Confirm new password" value={confirm} onChange={v => { setConfirm(v); setError(''); }} autoComplete="new-password" />
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex justify-end gap-2">
          {!forced && onClose && <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{busy ? 'Saving...' : 'Update password'}</span>
          </button>
        </div>
      </form>
    </Shell>
  );
};
