import React, { useState } from 'react';
import { Building2, Briefcase, ClipboardList, FileSpreadsheet, FileText, LayoutDashboard, ScrollText, Sparkles, Users } from 'lucide-react';
import { api, ReportType } from '../../services/api';
import { LaborMarketAnalytics, SystemAuditLog } from '../../types';
import { exportToCSV } from '../../utils/exportUtils';
import { downloadAdminReportPDF, downloadSkillsGapPDF } from '../../utils/reportPdf';
import { btnGhost, btnPrimary, field, label, Notify } from './ui';

interface ReportCard {
  id: ReportType | 'skills-gap';
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: string;
  /** Whether the date range applies to this report. */
  ranged: boolean;
  csv?: boolean;
}

const REPORTS: ReportCard[] = [
  { id: 'overview', title: 'Platform overview', description: 'Executive summary: users, employers, vacancies, application pipeline, six-month activity and security indicators.', icon: <LayoutDashboard className="w-5 h-5" />, tone: 'bg-amber-100 text-amber-700', ranged: true },
  { id: 'applications', title: 'Application tracking', description: 'Every application with employer, stage and match score, plus pipeline and top-employer breakdowns.', icon: <ClipboardList className="w-5 h-5" />, tone: 'bg-blue-100 text-blue-700', ranged: true, csv: true },
  { id: 'users', title: 'Candidate register', description: 'All candidate accounts with status, email verification, location, NQF level and last sign-in.', icon: <Users className="w-5 h-5" />, tone: 'bg-emerald-100 text-emerald-700', ranged: true, csv: true },
  { id: 'employers', title: 'Employer register', description: 'All employer accounts with verification, suspension status, live vacancies and applicants received.', icon: <Building2 className="w-5 h-5" />, tone: 'bg-indigo-100 text-indigo-700', ranged: true, csv: true },
  { id: 'vacancies', title: 'Vacancies', description: 'Every posted vacancy with sector, location, salary range and applicant demand.', icon: <Briefcase className="w-5 h-5" />, tone: 'bg-orange-100 text-orange-700', ranged: true, csv: true },
  { id: 'audit', title: 'Security & audit trail', description: 'Chronological log of sign-ins, failed attempts, password resets, account changes and admin actions.', icon: <ScrollText className="w-5 h-5" />, tone: 'bg-purple-100 text-purple-700', ranged: true, csv: true },
  { id: 'skills-gap', title: 'Skills gap diagnostic', description: 'Employer demand versus candidate supply by skill, province and sector, from live platform data.', icon: <Sparkles className="w-5 h-5" />, tone: 'bg-rose-100 text-rose-700', ranged: false },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

const PRESETS: Array<{ label: string; range: () => [string, string] }> = [
  { label: 'All time', range: () => ['', ''] },
  { label: 'Last 7 days', range: () => [daysAgo(7), ''] },
  { label: 'Last 30 days', range: () => [daysAgo(30), ''] },
  { label: 'Last 90 days', range: () => [daysAgo(90), ''] },
  { label: 'This month', range: () => [iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), ''] },
];

interface Props {
  analytics: LaborMarketAnalytics | null;
  auditLogs: SystemAuditLog[];
  adminLabel: string;
  notify: Notify;
}

export const ReportsCenter: React.FC<Props> = ({ analytics, auditLogs, adminLabel, notify }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const recent = auditLogs.filter(l => l.eventType === 'REPORT_EXPORTED').slice(0, 6);

  const run = async (card: ReportCard, format: 'pdf' | 'csv') => {
    const key = `${card.id}:${format}`;
    setBusy(key);
    try {
      if (card.id === 'skills-gap') {
        if (!analytics) throw new Error('Analytics are still loading. Try again in a moment.');
        downloadSkillsGapPDF(analytics, adminLabel);
      } else {
        const report = await api.getReport(card.id, { from: from || undefined, to: to || undefined });
        if (format === 'pdf') downloadAdminReportPDF(report);
        else exportToCSV(report.rows as Record<string, any>[], `Skillix_${card.title.replace(/\W+/g, '_')}_${iso(new Date())}`);
      }
      notify(`${card.title} ${format.toUpperCase()} downloaded.`);
    } catch (err: any) {
      notify(err.message || 'The report could not be generated.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Reporting period</h3>
            <p className="text-xs text-slate-500">Applies to every report below except the skills gap diagnostic, which always reflects today.</p>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className={label} htmlFor="rep-from">From</label>
              <input id="rep-from" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="rep-to">To</label>
              <input id="rep-to" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className={field} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {PRESETS.map(p => {
            const [f, t] = p.range();
            const active = f === from && t === to;
            return (
              <button key={p.label} onClick={() => { setFrom(f); setTo(t); }} aria-pressed={active} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${active ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {REPORTS.map(card => (
          <div key={card.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5">
            <div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${card.tone}`}>{card.icon}</div>
              <h3 className="text-sm font-black text-slate-900">{card.title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => run(card, 'pdf')} disabled={busy !== null} className={`${btnPrimary} flex-1`}>
                <FileText className="w-4 h-4" />
                <span>{busy === `${card.id}:pdf` ? 'Preparing...' : 'Download PDF'}</span>
              </button>
              {card.csv && (
                <button onClick={() => run(card, 'csv')} disabled={busy !== null} className={btnGhost} title="Download as CSV spreadsheet">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>CSV</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <h3 className="text-sm font-black text-slate-900">Recent report downloads</h3>
        <p className="text-xs text-slate-500 mb-3">Every export is recorded in the audit trail.</p>
        {recent.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold py-4">No reports have been downloaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {recent.map(l => (
              <li key={l.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-700 font-semibold">{l.description}</span>
                <span className="text-slate-400 whitespace-nowrap">{l.timestamp.slice(0, 16)} · {l.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
