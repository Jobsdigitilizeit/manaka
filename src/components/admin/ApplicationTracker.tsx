import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, History, Search } from 'lucide-react';
import { api } from '../../services/api';
import { ApplicationStatus, JobApplication } from '../../types';
import { exportToCSV } from '../../utils/exportUtils';
import { downloadAdminReportPDF } from '../../utils/reportPdf';
import { Badge, btnGhost, btnPrimary, EmptyState, field, label, Modal, Notify } from './ui';

const STAGES: ApplicationStatus[] = ['Under Review', 'Shortlisted', 'Interview Scheduled', 'Assessment Sent', 'Offered', 'Rejected'];
const PAGE_SIZE = 20;

const stageTone = (s: ApplicationStatus) =>
  s === 'Offered' ? 'green' : s === 'Rejected' ? 'red' : s === 'Under Review' ? 'slate' : 'blue';

interface Props {
  applications: JobApplication[];
  onRefresh: () => void;
  notify: Notify;
}

export const ApplicationTracker: React.FC<Props> = ({ applications, onRefresh, notify }) => {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<'all' | ApplicationStatus>('all');
  const [company, setCompany] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [historyFor, setHistoryFor] = useState<JobApplication | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const companies = useMemo(() => Array.from(new Set(applications.map(a => a.company))).sort(), [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter(a => {
      if (stage !== 'all' && a.status !== stage) return false;
      if (company !== 'all' && a.company !== company) return false;
      const day = a.appliedAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return !q || [a.userName, a.userEmail, a.jobTitle, a.company].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [applications, search, stage, company, from, to]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of applications) m[a.status] = (m[a.status] || 0) + 1;
    return m;
  }, [applications]);

  const changeStatus = async (app: JobApplication, status: ApplicationStatus) => {
    try {
      await api.updateApplicationStatus(app.id, status, 'Updated by administrator');
      notify(`${app.userName}'s application moved to "${status}".`);
      onRefresh();
    } catch (err: any) {
      notify(err.message || 'Could not update the application.', 'error');
    }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      downloadAdminReportPDF(await api.getReport('applications', { from: from || undefined, to: to || undefined }));
      notify('Application report downloaded as PDF.');
    } catch (err: any) {
      notify(err.message || 'Could not generate the PDF.', 'error');
    } finally {
      setPdfBusy(false);
    }
  };

  const exportCsv = () =>
    exportToCSV(
      filtered.map(a => ({
        Candidate: a.userName, Email: a.userEmail, Position: a.jobTitle, Employer: a.company, Applied: a.appliedAt,
        Stage: a.status, 'Match %': a.overallMatchScore, 'Last update': a.statusHistory?.at(-1)?.at ?? a.appliedAt,
      })),
      'Skillix_Applications_Filtered',
    );

  const reset = () => {
    setSearch(''); setStage('all'); setCompany('all'); setFrom(''); setTo(''); setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map(s => {
          const active = stage === s;
          return (
            <button
              key={s}
              onClick={() => { setStage(active ? 'all' : s); setPage(1); }}
              aria-pressed={active}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${active ? 'bg-amber-50 border-amber-400 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{s}</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{counts[s] || 0}</div>
              <div className="text-[11px] text-slate-400 font-semibold">{applications.length ? Math.round(((counts[s] || 0) / applications.length) * 100) : 0}% of total</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">Application tracker</h3>
            <p className="text-xs text-slate-500">Every application on the platform, with its full stage history.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportCsv} disabled={filtered.length === 0} className={btnGhost}>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV (current filter)</span>
            </button>
            <button onClick={downloadPdf} disabled={pdfBusy} className={btnPrimary} title="PDF of all applications in the selected date range">
              <FileText className="w-3.5 h-3.5" />
              <span>{pdfBusy ? 'Preparing...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 pt-4">
          <div className="relative xl:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search candidate, email, position or employer" className={`${field} pl-9`} aria-label="Search applications" />
          </div>
          <select value={company} onChange={e => { setCompany(e.target.value); setPage(1); }} className={`${field} cursor-pointer`} aria-label="Filter by employer">
            <option value="all">All employers</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div>
            <label className="sr-only" htmlFor="app-from">Applied from</label>
            <input id="app-from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className={field} title="Applied from" />
          </div>
          <div>
            <label className="sr-only" htmlFor="app-to">Applied to</label>
            <input id="app-to" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} className={field} title="Applied to" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 text-xs text-slate-500 font-semibold">
          <span>{filtered.length} of {applications.length} application(s)</span>
          {(search || stage !== 'all' || company !== 'all' || from || to) && <button onClick={reset} className="text-amber-700 hover:underline cursor-pointer font-bold">Clear filters</button>}
        </div>

        <div className="overflow-x-auto mt-3">
          {visible.length === 0 ? (
            <EmptyState>{applications.length === 0 ? 'No applications yet. They appear here the moment a candidate applies.' : 'No applications match the current filters.'}</EmptyState>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Applied</th>
                  <th className="p-3 text-right">Match</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3 text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{a.userName}</div>
                      <div className="text-[11px] text-slate-500">{a.userEmail}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{a.jobTitle}</div>
                      <div className="text-[11px] text-slate-500">{a.company}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-500">{a.appliedAt}</td>
                    <td className="p-3 text-right font-black text-slate-900">{a.overallMatchScore}%</td>
                    <td className="p-3">
                      <select
                        value={a.status}
                        onChange={e => changeStatus(a, e.target.value as ApplicationStatus)}
                        aria-label={`Stage for ${a.userName}`}
                        className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => setHistoryFor(a)} aria-label={`View history for ${a.userName}`} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between pt-4 text-xs font-bold text-slate-600">
            <span>Page {current} of {pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(current - 1)} disabled={current === 1} className={`${btnGhost} disabled:opacity-40`} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(current + 1)} disabled={current === pages} className={`${btnGhost} disabled:opacity-40`} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {historyFor && (
        <Modal title="Application history" subtitle={`${historyFor.userName} - ${historyFor.jobTitle} at ${historyFor.company}`} icon={<History className="w-5 h-5" />} onClose={() => setHistoryFor(null)}>
          <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5 text-xs">
            {(historyFor.statusHistory?.length ? historyFor.statusHistory : [{ status: historyFor.status, at: historyFor.appliedAt, by: historyFor.userName, note: 'Application submitted' }]).map((h, i, arr) => (
              <li key={i} className="pl-5 relative">
                <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${i === arr.length - 1 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={stageTone(h.status)}>{h.status}</Badge>
                  <span className="text-slate-400 font-semibold">{h.at}</span>
                </div>
                <div className="text-slate-600 mt-1">by <strong className="text-slate-800">{h.by}</strong></div>
                {h.note && <div className="text-slate-500 mt-0.5 italic">"{h.note}"</div>}
              </li>
            ))}
          </ol>
          {historyFor.coverLetterNotes && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className={label}>Candidate's note</span>
              <p className="text-xs text-slate-600 leading-relaxed">{historyFor.coverLetterNotes}</p>
            </div>
          )}
          <div className="flex justify-end mt-5"><button onClick={() => setHistoryFor(null)} className={btnGhost}>Close</button></div>
        </Modal>
      )}
    </div>
  );
};
