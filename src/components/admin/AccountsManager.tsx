import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Eye, FileText, KeyRound, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserX, Users, MailCheck, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { AdminAccount } from '../../types';
import { downloadAdminReportPDF } from '../../utils/reportPdf';
import { validatePassword } from '../../utils/validation';
import { Badge, btnDanger, btnGhost, btnPrimary, CredentialModal, EmptyState, field, formatWhen, label, Modal, Notify, PasswordChooser } from './ui';

type Segment = 'candidates' | 'employers' | 'admins';

interface Row {
  id: string;
  name: string;
  email: string;
  detail: string;
  suspended: boolean;
  suspendedReason?: string;
  emailVerified: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  isSelf: boolean;
  phone?: string;
  /** Every stored detail, shown in the full-details dialog. */
  fields: Array<[string, string]>;
}

const yn = (v: unknown) => (v ? 'Yes' : 'No');
const val = (v: unknown) => (v === undefined || v === null || v === '' ? '-' : String(v));

const SEGMENTS: Array<{ id: Segment; label: string; singular: string; icon: React.ReactNode }> = [
  { id: 'candidates', label: 'Candidates', singular: 'candidate', icon: <Users className="w-4 h-4" /> },
  { id: 'employers', label: 'Employers', singular: 'employer', icon: <Building2 className="w-4 h-4" /> },
  { id: 'admins', label: 'Administrators', singular: 'administrator', icon: <ShieldCheck className="w-4 h-4" /> },
];

interface Props {
  currentAdmin: AdminAccount | null;
  notify: Notify;
  onChanged: () => void;
}

export const AccountsManager: React.FC<Props> = ({ currentAdmin, notify, onChanged }) => {
  const [segment, setSegment] = useState<Segment>('candidates');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'unverified'>('all');
  const [pdfBusy, setPdfBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [statusTarget, setStatusTarget] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [viewTarget, setViewTarget] = useState<Row | null>(null);
  const [credentials, setCredentials] = useState<{ heading: string; name: string; email: string; password: string } | null>(null);

  const seg = SEGMENTS.find(s => s.id === segment)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (segment === 'candidates') {
        const users = await api.getUsers();
        setRows(users.map(u => ({
          id: u.id, name: u.name, email: u.email, detail: `${u.city}, ${u.province} · NQF ${u.nqfLevel}`,
          suspended: (u.status ?? 'active') !== 'active', suspendedReason: u.statusReason,
          emailVerified: u.emailVerified !== false, mustChangePassword: Boolean(u.mustChangePassword),
          lastLoginAt: u.lastLoginAt, createdAt: u.createdAt, isSelf: false, phone: u.phone,
          fields: [
            ['Account ID', u.id], ['Full name', u.name], ['Email', u.email], ['Phone', val(u.phone)],
            ['City', val(u.city)], ['Province', val(u.province)], ['NQF level', val(u.nqfLevel)],
            ['Experience (years)', val(u.totalExperienceYears)], ['Expected salary (ZAR / month)', u.expectedSalaryZAR ? u.expectedSalaryZAR.toLocaleString('en-ZA') : '-'],
            ['Employment-equity candidate', yn(u.isEE)], ['Headline', val(u.headline)], ['Bio', val(u.bio)],
            ['Skills', u.skills?.length ? u.skills.map(k => k.name).join(', ') : '-'],
            ['Education entries', String(u.education?.length ?? 0)], ['Experience entries', String(u.experience?.length ?? 0)],
            ['Status', val(u.status ?? 'active')], ['Status reason', val(u.statusReason)], ['Email verified', yn(u.emailVerified !== false)],
            ['Must change password', yn(u.mustChangePassword)], ['Created', val(u.createdAt)], ['Last active', val(u.lastActive)], ['Last sign-in', val(u.lastLoginAt)],
          ],
        })));
      } else if (segment === 'employers') {
        const companies = await api.getAdminCompanies();
        setRows(companies.map(c => ({
          id: c.id, name: c.name, email: c.email, detail: `${c.industry} · ${c.activeJobsCount ?? 0} live vacancies${c.verifiedEmployer ? ' · Verified' : ''}`,
          suspended: c.status === 'suspended', suspendedReason: c.statusReason,
          emailVerified: c.emailVerified !== false, mustChangePassword: Boolean(c.mustChangePassword),
          lastLoginAt: c.lastLoginAt, createdAt: c.createdAt, isSelf: false, phone: c.phone,
          fields: [
            ['Account ID', c.id], ['Company', c.name], ['Work email', c.email], ['Phone', val(c.phone)],
            ['Industry', val(c.industry)], ['HQ city', val(c.hqCity)], ['Province', val(c.province)], ['Website', val(c.website)],
            ['Company size', val(c.companySize)], ['B-BBEE level', val(c.beeLevel)], ['About', val(c.about)],
            ['Contact person', c.contactPerson ? `${c.contactPerson.name} (${c.contactPerson.role}) - ${c.contactPerson.email}` : '-'],
            ['Verified employer', yn(c.verifiedEmployer)], ['Live vacancies', val(c.activeJobsCount)], ['Total vacancies', val(c.totalJobsCount)],
            ['Applicants received', val(c.totalApplicantsReceived)], ['Status', val(c.status ?? 'active')], ['Status reason', val(c.statusReason)],
            ['Email verified', yn(c.emailVerified !== false)], ['Must change password', yn(c.mustChangePassword)], ['Created', val(c.createdAt)], ['Last sign-in', val(c.lastLoginAt)],
          ],
        })));
      } else {
        const admins = await api.getAdmins();
        setRows(admins.map(a => ({
          id: a.id, name: a.name, email: a.email, detail: a.id === currentAdmin?.id ? 'You' : 'Administrator',
          suspended: false, emailVerified: true, mustChangePassword: Boolean(a.mustChangePassword),
          lastLoginAt: a.lastLoginAt, createdAt: a.createdAt, isSelf: a.id === currentAdmin?.id,
          fields: [['Account ID', a.id], ['Name', a.name], ['Email', a.email], ['Must change password', yn(a.mustChangePassword)], ['Created', val(a.createdAt)], ['Last sign-in', val(a.lastLoginAt)]],
        })));
      }
    } catch (err: any) {
      notify(err.message || 'Could not load accounts.', 'error');
    } finally {
      setLoading(false);
    }
  }, [segment, currentAdmin?.id, notify]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
  }, [segment]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter === 'active' && r.suspended) return false;
      if (statusFilter === 'suspended' && !r.suspended) return false;
      if (statusFilter === 'unverified' && r.emailVerified) return false;
      return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const refresh = () => {
    load();
    onChanged();
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      downloadAdminReportPDF(await api.getReport(segment === 'candidates' ? 'users' : 'employers'));
      notify(`${seg.label} register downloaded as PDF.`);
    } catch (err: any) {
      notify(err.message || 'Could not generate the PDF.', 'error');
    } finally {
      setPdfBusy(false);
    }
  };

  const verifyEmail = async (row: Row) => {
    try {
      if (segment === 'candidates') await api.verifyUserEmail(row.id);
      else await api.verifyCompanyEmail(row.id);
      notify(`Email verified for ${row.name}.`);
      refresh();
    } catch (err: any) {
      notify(err.message || 'Could not verify email.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        {/* Segment switch + actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl text-xs font-bold self-start" role="tablist">
            {SEGMENTS.map(s => (
              <button
                key={s.id}
                role="tab"
                aria-selected={segment === s.id}
                onClick={() => setSegment(s.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${segment === s.id ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {s.icon}
                <span>{s.label}</span>
                {segment === s.id && <span className="px-1.5 rounded-full bg-slate-900 text-white text-[10px]">{rows.length}</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={load} className={btnGhost} title="Reload"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
            {segment !== 'admins' && (
              <button onClick={downloadPdf} disabled={pdfBusy} className={btnGhost}>
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>{pdfBusy ? 'Preparing...' : 'Download PDF'}</span>
              </button>
            )}
            <button onClick={() => setCreateOpen(true)} className={btnPrimary}>
              <Plus className="w-4 h-4" />
              <span>Add {seg.singular}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap pt-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${seg.label.toLowerCase()} by name or email`} className={`${field} pl-9`} aria-label="Search accounts" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={`${field} !w-auto cursor-pointer`} aria-label="Filter by status">
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            {segment !== 'admins' && <option value="suspended">Suspended</option>}
            {segment !== 'admins' && <option value="unverified">Email not verified</option>}
          </select>
          <span className="text-xs text-slate-400 font-semibold ml-auto">{filtered.length} of {rows.length}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          {loading && rows.length === 0 ? (
            <EmptyState>Loading accounts...</EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>{rows.length === 0 ? `No ${seg.label.toLowerCase()} yet. Use "Add ${seg.singular}" to create one.` : 'No accounts match the current filters.'}</EmptyState>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Account</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Last sign-in</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-50/80 ${r.suspended ? 'bg-rose-50/40' : ''}`}>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 text-sm">{r.name}{r.isSelf && <span className="ml-2 text-[10px] text-slate-400 font-bold">(you)</span>}</div>
                      <div className="text-[11px] text-slate-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</div>
                      <div className="text-[11px] text-slate-400">{r.detail}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {r.suspended ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Active</Badge>}
                        {!r.emailVerified && <Badge tone="amber">Email unverified</Badge>}
                        {r.mustChangePassword && <Badge tone="blue">Must change password</Badge>}
                      </div>
                      {r.suspended && r.suspendedReason && <div className="text-[10px] text-slate-400 mt-1 max-w-[180px] truncate" title={r.suspendedReason}>{r.suspendedReason}</div>}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{r.createdAt || '-'}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{formatWhen(r.lastLoginAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewTarget(r)} title="View all details" aria-label={`View details for ${r.name}`} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"><Eye className="w-4 h-4" /></button>
                        {!r.emailVerified && segment !== 'admins' && (
                          <button onClick={() => verifyEmail(r)} title="Mark email as verified" aria-label={`Verify email for ${r.name}`} className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"><MailCheck className="w-4 h-4" /></button>
                        )}
                        {!r.isSelf && (
                          <button onClick={() => setResetTarget(r)} title="Reset password" aria-label={`Reset password for ${r.name}`} className="p-2 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"><KeyRound className="w-4 h-4" /></button>
                        )}
                        {segment !== 'admins' && (
                          <button
                            onClick={() => setStatusTarget(r)}
                            title={r.suspended ? 'Reactivate account' : 'Suspend account'}
                            aria-label={`${r.suspended ? 'Reactivate' : 'Suspend'} ${r.name}`}
                            className={`p-2 rounded-xl cursor-pointer ${r.suspended ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'}`}
                          >
                            {r.suspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(r)}
                          disabled={r.isSelf}
                          title={r.isSelf ? 'You cannot delete your own account' : 'Delete account'}
                          aria-label={`Delete ${r.name}`}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {segment === 'candidates' && <p className="text-[11px] text-slate-400 mt-3">To edit a candidate's profile details or skills, use the Talent Pool tab.</p>}
      </div>

      {viewTarget && (
        <Modal title={viewTarget.name} subtitle="Everything stored for this account (credentials are never shown)" icon={<Eye className="w-5 h-5" />} onClose={() => setViewTarget(null)} width="max-w-2xl">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            {viewTarget.fields.map(([k, v]) => (
              <div key={k} className={k === 'Bio' || k === 'About' || k === 'Skills' ? 'sm:col-span-2' : ''}>
                <dt className={label}>{k}</dt>
                <dd className="text-slate-800 font-semibold break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end mt-5"><button onClick={() => setViewTarget(null)} className={btnGhost}>Close</button></div>
        </Modal>
      )}

      {createOpen && (
        <CreateAccountModal
          segment={segment}
          singular={seg.singular}
          onClose={() => setCreateOpen(false)}
          onCreated={(name, email, password) => {
            setCreateOpen(false);
            setCredentials({ heading: `${seg.singular[0].toUpperCase()}${seg.singular.slice(1)} account created`, name, email, password });
            refresh();
          }}
          notify={notify}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          segment={segment}
          target={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={password => {
            setCredentials({ heading: 'Password reset', name: resetTarget.name, email: resetTarget.email, password });
            setResetTarget(null);
            refresh();
          }}
          notify={notify}
        />
      )}

      {statusTarget && (
        <StatusModal
          segment={segment}
          target={statusTarget}
          onClose={() => setStatusTarget(null)}
          onDone={msg => {
            notify(msg);
            setStatusTarget(null);
            refresh();
          }}
          notify={notify}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          segment={segment}
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDone={msg => {
            notify(msg);
            setDeleteTarget(null);
            refresh();
          }}
          notify={notify}
        />
      )}

      {credentials && (
        <CredentialModal heading={credentials.heading} accountName={credentials.name} email={credentials.email} password={credentials.password} onClose={() => setCredentials(null)} />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Modals                                                                     */
/* -------------------------------------------------------------------------- */

const CreateAccountModal: React.FC<{
  segment: Segment;
  singular: string;
  onClose: () => void;
  onCreated: (name: string, email: string, password: string) => void;
  notify: Notify;
}> = ({ segment, singular, onClose, onCreated, notify }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [extra, setExtra] = useState('');
  const [mode, setMode] = useState<'generate' | 'manual'>('generate');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'manual' && !validatePassword(password).isValid) return setError('The password does not meet all requirements.');
    setBusy(true);
    try {
      const pw = mode === 'manual' ? password : undefined;
      let issued: string;
      if (segment === 'candidates') issued = (await api.createUser({ name, email, phone: extra, password: pw })).password;
      else if (segment === 'employers') issued = (await api.createCompany({ name, email, industry: extra || undefined, password: pw })).password;
      else issued = (await api.createAdmin({ name, email, password: pw })).password;
      onCreated(name, email, issued);
    } catch (err: any) {
      setError(err.message || 'Could not create the account.');
      notify('Account was not created.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Add ${singular}`} subtitle="The account is active immediately and the email is treated as verified." icon={<Plus className="w-5 h-5" />} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={label} htmlFor="acct-name">{segment === 'employers' ? 'Company name' : 'Full name'}</label>
          <input id="acct-name" required value={name} onChange={e => setName(e.target.value)} className={field} autoFocus />
        </div>
        <div>
          <label className={label} htmlFor="acct-email">{segment === 'employers' ? 'Work email' : 'Email address'}</label>
          <input id="acct-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className={field} />
        </div>
        {segment !== 'admins' && (
          <div>
            <label className={label} htmlFor="acct-extra">{segment === 'employers' ? 'Industry (optional)' : 'Phone (optional)'}</label>
            <input id="acct-extra" value={extra} onChange={e => setExtra(e.target.value)} className={field} />
          </div>
        )}
        <PasswordChooser mode={mode} onModeChange={setMode} value={password} onChange={setPassword} />
        {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Creating...' : `Create ${singular}`}</button>
        </div>
      </form>
    </Modal>
  );
};

const ResetPasswordModal: React.FC<{
  segment: Segment;
  target: Row;
  onClose: () => void;
  onDone: (password: string) => void;
  notify: Notify;
}> = ({ segment, target, onClose, onDone, notify }) => {
  const [mode, setMode] = useState<'generate' | 'manual'>('generate');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (mode === 'manual' && !validatePassword(password).isValid) return setError('The password does not meet all requirements.');
    setBusy(true);
    try {
      const pw = mode === 'manual' ? password : undefined;
      const res = segment === 'candidates' ? await api.resetUserPassword(target.id, pw)
        : segment === 'employers' ? await api.resetCompanyPassword(target.id, pw)
        : await api.resetAdminPassword(target.id, pw);
      onDone(res.password);
    } catch (err: any) {
      setError(err.message || 'Could not reset the password.');
      notify('Password was not reset.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Reset password" subtitle={`${target.name} (${target.email})`} icon={<KeyRound className="w-5 h-5" />} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          The current password stops working and every signed-in session for this account is ended. They will be asked to choose a new password at next sign-in.
        </p>
        <PasswordChooser mode={mode} onModeChange={setMode} value={password} onChange={setPassword} />
        {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy} className={btnPrimary}>{busy ? 'Resetting...' : 'Reset password'}</button>
        </div>
      </div>
    </Modal>
  );
};

const StatusModal: React.FC<{
  segment: Segment;
  target: Row;
  onClose: () => void;
  onDone: (message: string) => void;
  notify: Notify;
}> = ({ segment, target, onClose, onDone, notify }) => {
  const reactivating = target.suspended;
  const [reason, setReason] = useState(reactivating ? '' : 'Compliance or identity verification review');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (segment === 'candidates') await api.updateUserStatus(target.id, reactivating ? 'active' : 'revoked', reason);
      else await api.setCompanyStatus(target.id, reactivating ? 'active' : 'suspended', reason);
      onDone(reactivating ? `${target.name} has been reactivated.` : `${target.name} has been suspended and signed out.`);
    } catch (err: any) {
      notify(err.message || 'Could not update the account.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={reactivating ? 'Reactivate account' : 'Suspend account'} subtitle={`${target.name} (${target.email})`} icon={reactivating ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          {reactivating
            ? 'They will be able to sign in again immediately.'
            : segment === 'employers'
              ? 'They are signed out immediately, cannot sign in, and all their vacancies are paused.'
              : 'They are signed out immediately and cannot sign in until reactivated. Their data is kept.'}
        </p>
        {!reactivating && (
          <div>
            <label className={label} htmlFor="status-reason">Reason (shown to the user at sign-in)</label>
            <input id="status-reason" value={reason} onChange={e => setReason(e.target.value)} className={field} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy} className={reactivating ? btnPrimary : btnDanger}>{busy ? 'Saving...' : reactivating ? 'Reactivate' : 'Suspend'}</button>
        </div>
      </div>
    </Modal>
  );
};

const DeleteModal: React.FC<{
  segment: Segment;
  target: Row;
  onClose: () => void;
  onDone: (message: string) => void;
  notify: Notify;
}> = ({ segment, target, onClose, onDone, notify }) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const consequences =
    segment === 'candidates' ? 'Their profile and every application they submitted are permanently deleted.'
    : segment === 'employers' ? 'Their company profile, all of their vacancies and every application received for those vacancies are permanently deleted.'
    : 'This administrator can no longer sign in.';

  const submit = async () => {
    setBusy(true);
    try {
      if (segment === 'candidates') {
        const r = await api.deleteUser(target.id);
        onDone(`Deleted ${target.name} and ${r.removedApplications} application(s).`);
      } else if (segment === 'employers') {
        const r = await api.deleteCompany(target.id);
        onDone(`Deleted ${target.name}, ${r.removedJobs} vacancy(ies) and ${r.removedApplications} application(s).`);
      } else {
        await api.deleteAdmin(target.id);
        onDone(`Deleted administrator ${target.name}.`);
      }
    } catch (err: any) {
      notify(err.message || 'Could not delete the account.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Delete account permanently" subtitle={`${target.name} (${target.email})`} icon={<Trash2 className="w-5 h-5" />} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed"><strong>This cannot be undone.</strong> {consequences} If you only want to block access, suspend the account instead.</p>
        </div>
        <div>
          <label className={label} htmlFor="delete-confirm">Type DELETE to confirm</label>
          <input id="delete-confirm" value={typed} onChange={e => setTyped(e.target.value)} className={field} autoComplete="off" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy || typed !== 'DELETE'} className={btnDanger}>{busy ? 'Deleting...' : 'Delete permanently'}</button>
        </div>
      </div>
    </Modal>
  );
};
