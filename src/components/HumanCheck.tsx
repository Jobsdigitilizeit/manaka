import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { api, HumanChallengeAnswer } from '../services/api';

interface Challenge extends HumanChallengeAnswer {
  question: string;
}

export const HumanCheck: React.FC<{ onChange: (proof: HumanChallengeAnswer) => void }> = ({ onChange }) => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getHumanChallenge();
      if (!result.success || !result.challengeId || !result.question) throw new Error('Challenge unavailable');
      const next = { challengeId: result.challengeId, question: result.question, answer: '', website: '' };
      setChallenge(next);
      onChange({ challengeId: next.challengeId, answer: '', website: '' });
    } catch {
      setChallenge(null);
      onChange({ challengeId: '', answer: '', website: '' });
      setError('Human check could not load. Refresh the question to try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChallenge();
  }, []);

  const update = (patch: Partial<Challenge>) => {
    if (!challenge) return;
    const next = { ...challenge, ...patch };
    setChallenge(next);
    onChange({ challengeId: next.challengeId, answer: next.answer, website: next.website });
  };

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <legend className="px-1 text-xs font-semibold text-slate-700">Human verification</legend>
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>{loading ? 'Loading question...' : challenge ? `Solve ${challenge.question}` : 'Question unavailable'}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          aria-label="Answer to human verification question"
          inputMode="numeric"
          autoComplete="off"
          value={challenge?.answer || ''}
          onChange={event => update({ answer: event.target.value.replace(/\D/g, '').slice(0, 3) })}
          disabled={loading || !challenge}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          placeholder="Answer"
        />
        <button type="button" onClick={() => void loadChallenge()} disabled={loading} aria-label="Refresh human verification question" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={challenge?.website || ''}
        onChange={event => update({ website: event.target.value })}
        className="absolute -left-[10000px] h-px w-px opacity-0"
      />
      {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    </fieldset>
  );
};