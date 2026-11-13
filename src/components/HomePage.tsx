import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BarChart3, Briefcase, Building2, CheckCircle2, Clock, Compass, Eye, EyeOff, FileCheck, GraduationCap,
  MapPin, RefreshCw, Search, ShieldAlert, ShieldCheck, Sparkles, Target, UserPlus, Users, X,
} from 'lucide-react';
import { api, AuthResult, HumanChallengeAnswer } from '../services/api';
import { AuthRole, JobPosting } from '../types';
import { validateEmail, validatePassword, validatePasswordMatch } from '../utils/validation';
import { ForgotPasswordModal, PasswordRules, VerifyEmailModal } from './AuthFlows';
import { HumanCheck } from './HumanCheck';

interface HomePageProps {
  /** Called with a live session once someone has signed in or finished verifying their email. */
  onSignedIn: (result: AuthResult) => void;
}

type Dialog = 'none' | 'signin' | 'choose' | 'seeker' | 'employer';

const PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'];
const INDUSTRIES = [
  'Software & Tech', 'FinTech & Banking', 'Mining & Resources', 'Renewable Energy', 'Healthcare & Biotech',
  'Retail & E-commerce', 'Telecommunications', 'Consulting & BPO', 'Logistics & Supply Chain', 'Other',
];
const NQF_LEVELS = [
  [4, 'NQF 4 - Matric / Grade 12'], [5, 'NQF 5 - Higher Certificate'], [6, 'NQF 6 - Diploma / Advanced Certificate'],
  [7, "NQF 7 - Bachelor's Degree"], [8, 'NQF 8 - Honours / Postgraduate Diploma'], [9, "NQF 9 - Master's Degree"], [10, 'NQF 10 - Doctorate'],
] as const;

const input =
  'w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500';
const lbl = 'block text-xs font-semibold text-slate-700 mb-1.5';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer';
const btnOutline =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold transition-colors cursor-pointer';

const money = (n: number) => `R${Math.round(n).toLocaleString('en-ZA')}`;

const Logo: React.FC<{ light?: boolean }> = ({ light }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-lg">S</div>
    <span className={`font-extrabold text-xl tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>Skillix</span>
  </div>
);

const Modal: React.FC<{ title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ title, subtitle, onClose, wide, children }) => (
  <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} my-auto`}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const ErrorNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

const PasswordInput: React.FC<{ id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string }> = ({ id, value, onChange, autoComplete, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} required autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={`${input} pr-10`} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

export const HomePage: React.FC<HomePageProps> = ({ onSignedIn }) => {
  const [dialog, setDialog] = useState<Dialog>('none');
  const [pendingVerify, setPendingVerify] = useState<{ accountType: AuthRole; email: string } | null>(null);
  const [forgotEmail, setForgotEmail] = useState<string | null>(null);

  // Live vacancies + platform counts (public, aggregate only)
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [stats, setStats] = useState<{ users: number; jobs: number; employers: number } | null>(null);
  const [keyword, setKeyword] = useState('');
  const [place, setPlace] = useState('');

  useEffect(() => {
    api.getJobs().then(setJobs).catch(() => setJobs([])).finally(() => setJobsLoading(false));
    api.checkHealth().then(h => setStats({ users: h.totalUsers ?? 0, jobs: h.totalJobs ?? 0, employers: h.totalEmployers ?? 0 })).catch(() => {});
  }, []);

  const results = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const p = place.trim().toLowerCase();
    return jobs.filter(j =>
      (!k || [j.title, j.company, j.description, ...j.requiredSkills].some(v => (v || '').toLowerCase().includes(k))) &&
      (!p || `${j.city} ${j.province}`.toLowerCase().includes(p)));
  }, [jobs, keyword, place]);

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const needVerification = (res: { accountType?: AuthRole; email?: string }, fallback: { accountType: AuthRole; email: string }) => {
    setPendingVerify({ accountType: res.accountType || fallback.accountType, email: res.email || fallback.email });
    setDialog('none');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* ------------------------------- Navigation ------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Main">
              <button onClick={() => goTo('jobs')} className="hover:text-slate-900 cursor-pointer">Find jobs</button>
              <button onClick={() => goTo('how')} className="hover:text-slate-900 cursor-pointer">How it works</button>
              <button onClick={() => goTo('employers')} className="hover:text-slate-900 cursor-pointer">For employers</button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDialog('signin')} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">Sign in</button>
            <button onClick={() => setDialog('choose')} className={btnPrimary}>Get started</button>
          </div>
        </div>
      </header>

      {/* ---------------------------------- Hero ---------------------------------- */}
      <section className="relative bg-gradient-to-b from-emerald-50 via-white to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Skills-first hiring for South Africa
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Find work that fits the skills you already have.
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-2xl">
              Build a verified skills profile, see exactly how you match every vacancy, and know what to learn next. Employers hire on proven ability, not guesswork.
            </p>
          </div>

          <form
            onSubmit={e => { e.preventDefault(); goTo('jobs'); }}
            className="mt-9 bg-white rounded-xl shadow-lg shadow-slate-200/70 border border-slate-200 p-2 flex flex-col md:flex-row gap-2 max-w-4xl"
            role="search"
          >
            <label className="flex-1 flex items-center gap-3 px-3 rounded-lg focus-within:bg-slate-50">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <span className="sr-only">Job title, skill or company</span>
              <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Job title, skill or company" className="w-full py-3 bg-transparent text-sm focus:outline-none placeholder-slate-400" />
            </label>
            <label className="flex-1 flex items-center gap-3 px-3 rounded-lg md:border-l border-slate-200 focus-within:bg-slate-50">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
              <span className="sr-only">City or province</span>
              <input value={place} onChange={e => setPlace(e.target.value)} placeholder="City or province" className="w-full py-3 bg-transparent text-sm focus:outline-none placeholder-slate-400" />
            </label>
            <button type="submit" className={`${btnPrimary} md:px-8`}>Search jobs</button>
          </form>

          <dl className="mt-12 grid grid-cols-3 gap-6 max-w-xl">
            {([
              ['Live vacancies', stats?.jobs],
              ['Job seekers', stats?.users],
              ['Employers', stats?.employers],
            ] as Array<[string, number | undefined]>).map(([label, value]) => (
              <div key={label}>
                <dd className="text-3xl font-extrabold text-slate-900">{value === undefined ? '-' : value.toLocaleString('en-ZA')}</dd>
                <dt className="text-sm text-slate-500 mt-0.5">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------ Live vacancies ----------------------------- */}
      <section id="jobs" className="scroll-mt-20 py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Latest vacancies</h2>
              <p className="text-slate-500 mt-1">{jobsLoading ? 'Loading...' : `${results.length} ${results.length === 1 ? 'job' : 'jobs'}${keyword || place ? ' match your search' : ' open right now'}`}</p>
            </div>
            {(keyword || place) && (
              <button onClick={() => { setKeyword(''); setPlace(''); }} className="text-sm font-semibold text-emerald-700 hover:underline self-start sm:self-auto cursor-pointer">Clear search</button>
            )}
          </div>

          {!jobsLoading && results.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-14 px-6 text-center">
              <Briefcase className="w-9 h-9 text-slate-300 mx-auto" />
              <h3 className="mt-3 font-semibold text-slate-800">{jobs.length === 0 ? 'No vacancies have been posted yet' : 'No vacancies match your search'}</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {jobs.length === 0 ? 'Employers can post the first role in minutes. Create a job seeker profile now and get matched as soon as roles go live.' : 'Try a different keyword or location.'}
              </p>
              {jobs.length === 0 && (
                <div className="mt-5 flex justify-center gap-3 flex-wrap">
                  <button onClick={() => setDialog('seeker')} className={btnPrimary}>Create job seeker profile</button>
                  <button onClick={() => setDialog('employer')} className={btnOutline}>Post a job</button>
                </div>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.slice(0, 12).map(job => (
                <li key={job.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">{job.company.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                      <p className="text-sm text-slate-600">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.city}</span>
                        <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.workModel} · {job.employmentType}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.postedDate}</span>
                      </div>
                      {job.salaryMaxZAR > 0 && (
                        <p className="mt-2 text-sm font-semibold text-emerald-700">{money(job.salaryMinZAR)} - {money(job.salaryMaxZAR)} <span className="font-normal text-slate-500">/ {job.salaryPeriod === 'annual' ? 'year' : 'month'}</span></p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.requiredSkills.slice(0, 5).map(s => <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">{s}</span>)}
                      </div>
                    </div>
                    <button onClick={() => setDialog('signin')} className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold cursor-pointer shrink-0">Apply</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {results.length > 12 && (
            <div className="text-center mt-8">
              <button onClick={() => setDialog('choose')} className={btnOutline}>Sign up to see all {results.length} jobs <ArrowRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------- How it works ------------------------------ */}
      <section id="how" className="scroll-mt-20 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How Skillix works for job seekers</h2>
            <p className="text-slate-500 mt-2">From CV to confident applications in three steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { icon: <UserPlus className="w-5 h-5" />, step: '1', title: 'Build your skills profile', text: 'Add your qualifications and skills, or upload a CV and let AI extract them. Your NQF level and experience are captured once.' },
              { icon: <Target className="w-5 h-5" />, step: '2', title: 'See how you match', text: 'Every vacancy shows which required skills you have, which you are missing, and why it was recommended.' },
              { icon: <FileCheck className="w-5 h-5" />, step: '3', title: 'Apply and track', text: 'Apply in one click and follow each application from review to offer, with a full history of every stage.' },
            ].map(s => (
              <div key={s.step} className="border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">{s.icon}</div>
                  <span className="text-sm font-bold text-slate-300">Step {s.step}</span>
                </div>
                <h3 className="mt-5 font-semibold text-lg">{s.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {[
              { icon: <Sparkles className="w-5 h-5" />, title: 'AI skill extraction', text: 'Turn a CV into a structured profile in seconds.' },
              { icon: <GraduationCap className="w-5 h-5" />, title: 'Verified skills', text: 'Pass a short quiz to earn a verified badge employers can trust.' },
              { icon: <Compass className="w-5 h-5" />, title: 'Career roadmap', text: 'Get a personalised plan for the skills to learn next.' },
              { icon: <BarChart3 className="w-5 h-5" />, title: 'Transparent matching', text: 'Scores are based on skills, qualification and experience, and fully explained.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- For employers ------------------------------ */}
      <section id="employers" className="scroll-mt-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-emerald-300 text-sm font-semibold"><Building2 className="w-4 h-4" /> For employers</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Hire people who can actually do the job.</h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              Post vacancies, search a pool of skills-verified candidates, and manage every applicant from one pipeline.
            </p>
            <ul className="mt-6 space-y-3 text-slate-200">
              {['Post a vacancy in minutes, with AI help writing the description', 'Search candidates by skill, qualification and location', 'Track applicants through review, interview and offer', 'Share your vacancies directly with matching candidates'].map(t => (
                <li key={t} className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /><span>{t}</span></li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => setDialog('employer')} className={btnPrimary}>Post a job</button>
              <button onClick={() => setDialog('signin')} className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-600 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer">Employer sign in</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Users className="w-5 h-5" />, t: 'Talent search', d: 'Filter by skills, NQF level and province.' },
              { icon: <FileCheck className="w-5 h-5" />, t: 'Applicant pipeline', d: 'Move candidates between stages with notes.' },
              { icon: <Briefcase className="w-5 h-5" />, t: 'Vacancy management', d: 'Pause, edit or close roles any time.' },
              { icon: <ShieldCheck className="w-5 h-5" />, t: 'Verified accounts', d: 'Every account confirms its email address.' },
            ].map(c => (
              <div key={c.t} className="rounded-xl bg-slate-800/70 border border-slate-700 p-5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center">{c.icon}</div>
                <h3 className="mt-3 font-semibold">{c.t}</h3>
                <p className="text-sm text-slate-400 mt-1">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------- CTA ----------------------------------- */}
      <section className="py-16 lg:py-20 bg-emerald-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to find your next role?</h2>
          <p className="text-slate-600 mt-3">Create a free profile in a few minutes.</p>
          <div className="mt-7 flex justify-center gap-3 flex-wrap">
            <button onClick={() => setDialog('seeker')} className={btnPrimary}>Create your profile <ArrowRight className="w-4 h-4" /></button>
            <button onClick={() => setDialog('signin')} className={btnOutline}>Sign in</button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <Logo light />
          <p>Skills-first job matching for South Africa. Your information is processed in line with POPIA.</p>
          <p>© {new Date().getFullYear()} Skillix</p>
        </div>
      </footer>

      {/* --------------------------------- Dialogs --------------------------------- */}
      {dialog === 'signin' && (
        <SignInDialog
          onClose={() => setDialog('none')}
          onSignedIn={res => { setDialog('none'); onSignedIn(res); }}
          onNeedVerification={needVerification}
          onForgot={email => { setForgotEmail(email); setDialog('none'); }}
          onCreate={() => setDialog('choose')}
        />
      )}

      {dialog === 'choose' && (
        <Modal title="Join Skillix" subtitle="How will you use Skillix?" onClose={() => setDialog('none')}>
          <div className="grid gap-3">
            <button onClick={() => setDialog('seeker')} className="text-left flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors cursor-pointer">
              <div className="w-11 h-11 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Users className="w-5 h-5" /></div>
              <div className="flex-1"><div className="font-semibold">I'm looking for work</div><div className="text-sm text-slate-500">Build a profile and get matched to jobs</div></div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => setDialog('employer')} className="text-left flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors cursor-pointer">
              <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
              <div className="flex-1"><div className="font-semibold">I'm hiring</div><div className="text-sm text-slate-500">Post jobs and find verified talent</div></div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <p className="text-sm text-slate-500 text-center mt-5">Already have an account? <button onClick={() => setDialog('signin')} className="font-semibold text-emerald-700 hover:underline cursor-pointer">Sign in</button></p>
        </Modal>
      )}

      {dialog === 'seeker' && (
        <SeekerSignUp onClose={() => setDialog('none')} onBack={() => setDialog('choose')} onSignIn={() => setDialog('signin')} onNeedVerification={needVerification} />
      )}
      {dialog === 'employer' && (
        <EmployerSignUp onClose={() => setDialog('none')} onBack={() => setDialog('choose')} onSignIn={() => setDialog('signin')} onNeedVerification={needVerification} />
      )}

      {pendingVerify && (
        <VerifyEmailModal
          accountType={pendingVerify.accountType}
          email={pendingVerify.email}
          onClose={() => setPendingVerify(null)}
        />
      )}
      {forgotEmail !== null && <ForgotPasswordModal accountType="any" defaultEmail={forgotEmail} onClose={() => { setForgotEmail(null); setDialog('signin'); }} />}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Sign in (one form for everyone - the server detects the account type)       */
/* -------------------------------------------------------------------------- */

type VerifyHandler = (res: { accountType?: AuthRole; email?: string }, fallback: { accountType: AuthRole; email: string }) => void;

const NETWORK_ERROR = 'We could not reach the server. Check your connection and try again.';

const SignInDialog: React.FC<{
  onClose: () => void;
  onSignedIn: (res: AuthResult) => void;
  onNeedVerification: VerifyHandler;
  onForgot: (email: string) => void;
  onCreate: () => void;
}> = ({ onClose, onSignedIn, onNeedVerification, onForgot, onCreate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const check = validateEmail(email);
    if (!check.isValid) return setError(check.error || 'Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    try {
      const res = await api.signIn(email.trim(), password);
      if (res.success && res.token) onSignedIn(res);
      else if (res.needsVerification) onNeedVerification(res, { accountType: 'user', email: email.trim().toLowerCase() });
      else setError(res.error || 'Sign in failed. Check your details and try again.');
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Welcome back" subtitle="Sign in to your Skillix account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="si-email" className={lbl}>Email address</label>
          <input id="si-email" type="email" required autoFocus autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@example.co.za" className={input} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="si-password" className="text-xs font-semibold text-slate-700">Password</label>
            <button type="button" onClick={() => onForgot(email)} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">Forgot password?</button>
          </div>
          <PasswordInput id="si-password" value={password} onChange={v => { setPassword(v); setError(''); }} autoComplete="current-password" />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
          {busy && <RefreshCw className="w-4 h-4 animate-spin" />}
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-sm text-slate-500 text-center">New to Skillix? <button type="button" onClick={onCreate} className="font-semibold text-emerald-700 hover:underline cursor-pointer">Create an account</button></p>
      </form>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/*  Sign up                                                                    */
/* -------------------------------------------------------------------------- */

interface SignUpProps {
  onClose: () => void;
  onBack: () => void;
  onSignIn: () => void;
  onNeedVerification: VerifyHandler;
}

const SeekerSignUp: React.FC<SignUpProps> = ({ onClose, onBack, onSignIn, onNeedVerification }) => {
  const [f, setF] = useState({ name: '', email: '', phone: '', city: '', province: 'Gauteng', nqf: 7, years: 0, skills: '', password: '', confirm: '', consent: false });
  const [human, setHuman] = useState<HumanChallengeAnswer>({ challengeId: '', answer: '', website: '' });
  const [humanKey, setHumanKey] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => { setF(prev => ({ ...prev, ...patch })); setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateEmail(f.email);
    if (!f.name.trim()) return setError('Enter your full name.');
    if (!emailCheck.isValid) return setError(emailCheck.error || 'Enter a valid email address.');
    if (!f.city.trim()) return setError('Enter your city.');
    if (!validatePassword(f.password).isValid) return setError('Your password does not meet all the requirements below.');
    const match = validatePasswordMatch(f.password, f.confirm);
    if (!match.isMatch) return setError(match.error || 'Passwords do not match.');
    if (!f.consent) return setError('Please agree to the processing of your information to continue.');
    setBusy(true);
    try {
      const skills = f.skills.split(',').map(s => s.trim()).filter(Boolean).map(name => ({ name, category: 'technical' as const, proficiency: 'Intermediate' as const, verifiedByQuiz: false, confidenceScore: 70 }));
      const res = await api.registerCandidate({
        name: f.name.trim(), email: f.email.trim().toLowerCase(), password: f.password, phone: f.phone.trim(), city: f.city.trim(), province: f.province,
        nqfLevel: f.nqf, totalExperienceYears: f.years, skills, human,
      });
      if (res.success && res.needsVerification) onNeedVerification(res, { accountType: 'user', email: f.email.trim().toLowerCase() });
      else setError(res.error || 'We could not create your account.');
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      setHumanKey(key => key + 1);
    }
  };

  return (
    <Modal title="Create your profile" subtitle="Free for job seekers. Takes about two minutes." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="js-name" className={lbl}>Full name</label><input id="js-name" required autoComplete="name" value={f.name} onChange={e => set({ name: e.target.value })} className={input} /></div>
          <div><label htmlFor="js-email" className={lbl}>Email address</label><input id="js-email" type="email" required autoComplete="email" value={f.email} onChange={e => set({ email: e.target.value })} className={input} /></div>
          <div><label htmlFor="js-phone" className={lbl}>Phone <span className="font-normal text-slate-400">(optional)</span></label><input id="js-phone" type="tel" autoComplete="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} className={input} /></div>
          <div><label htmlFor="js-city" className={lbl}>City</label><input id="js-city" required autoComplete="address-level2" value={f.city} onChange={e => set({ city: e.target.value })} className={input} /></div>
          <div><label htmlFor="js-prov" className={lbl}>Province</label><select id="js-prov" value={f.province} onChange={e => set({ province: e.target.value })} className={input}>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></div>
          <div><label htmlFor="js-nqf" className={lbl}>Highest qualification</label><select id="js-nqf" value={f.nqf} onChange={e => set({ nqf: Number(e.target.value) })} className={input}>{NQF_LEVELS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
          <div><label htmlFor="js-years" className={lbl}>Years of experience</label><input id="js-years" type="number" min={0} max={60} value={f.years} onChange={e => set({ years: Math.max(0, Number(e.target.value) || 0) })} className={input} /></div>
          <div><label htmlFor="js-skills" className={lbl}>Key skills <span className="font-normal text-slate-400">(comma-separated, optional)</span></label><input id="js-skills" value={f.skills} onChange={e => set({ skills: e.target.value })} className={input} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="js-pw" className={lbl}>Password</label><PasswordInput id="js-pw" value={f.password} onChange={v => set({ password: v })} autoComplete="new-password" /></div>
          <div><label htmlFor="js-pw2" className={lbl}>Confirm password</label><PasswordInput id="js-pw2" value={f.confirm} onChange={v => set({ confirm: v })} autoComplete="new-password" /></div>
        </div>
        {f.password && <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><PasswordRules password={f.password} /></div>}
        <HumanCheck key={humanKey} onChange={setHuman} />
        <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={f.consent} onChange={e => set({ consent: e.target.checked })} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          <span>I agree to Skillix processing my information to match me with jobs, in line with POPIA.</span>
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">Back</button>
          <button type="submit" disabled={busy} className={btnPrimary}>{busy && <RefreshCw className="w-4 h-4 animate-spin" />}{busy ? 'Creating...' : 'Create account'}</button>
        </div>
        <p className="text-sm text-slate-500 text-center">Already registered? <button type="button" onClick={onSignIn} className="font-semibold text-emerald-700 hover:underline cursor-pointer">Sign in</button></p>
      </form>
    </Modal>
  );
};

const EmployerSignUp: React.FC<SignUpProps> = ({ onClose, onBack, onSignIn, onNeedVerification }) => {
  const [f, setF] = useState({ name: '', email: '', industry: INDUSTRIES[0], city: '', province: 'Gauteng', about: '', password: '', confirm: '', consent: false });
  const [human, setHuman] = useState<HumanChallengeAnswer>({ challengeId: '', answer: '', website: '' });
  const [humanKey, setHumanKey] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => { setF(prev => ({ ...prev, ...patch })); setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateEmail(f.email);
    if (!f.name.trim()) return setError('Enter your company name.');
    if (!emailCheck.isValid) return setError(emailCheck.error || 'Enter a valid work email.');
    if (!f.city.trim()) return setError('Enter your head-office city.');
    if (!validatePassword(f.password).isValid) return setError('Your password does not meet all the requirements below.');
    const match = validatePasswordMatch(f.password, f.confirm);
    if (!match.isMatch) return setError(match.error || 'Passwords do not match.');
    if (!f.consent) return setError('Please agree to the terms to continue.');
    setBusy(true);
    try {
      const res = await api.registerCompany({
        name: f.name.trim(), email: f.email.trim().toLowerCase(), password: f.password, industry: f.industry,
        hqCity: f.city.trim(), province: f.province, about: f.about.trim(), human,
      });
      if (res.success && res.needsVerification) onNeedVerification(res, { accountType: 'employer', email: f.email.trim().toLowerCase() });
      else setError(res.error || 'We could not create your company account.');
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      setHumanKey(key => key + 1);
    }
  };

  return (
    <Modal title="Create your employer account" subtitle="Post jobs and hire verified talent." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="em-name" className={lbl}>Company name</label><input id="em-name" required autoComplete="organization" value={f.name} onChange={e => set({ name: e.target.value })} className={input} /></div>
          <div><label htmlFor="em-email" className={lbl}>Work email</label><input id="em-email" type="email" required autoComplete="email" value={f.email} onChange={e => set({ email: e.target.value })} placeholder="talent@company.co.za" className={input} /></div>
          <div><label htmlFor="em-ind" className={lbl}>Industry</label><select id="em-ind" value={f.industry} onChange={e => set({ industry: e.target.value })} className={input}>{INDUSTRIES.map(i => <option key={i}>{i}</option>)}</select></div>
          <div><label htmlFor="em-city" className={lbl}>Head-office city</label><input id="em-city" required value={f.city} onChange={e => set({ city: e.target.value })} className={input} /></div>
          <div><label htmlFor="em-prov" className={lbl}>Province</label><select id="em-prov" value={f.province} onChange={e => set({ province: e.target.value })} className={input}>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></div>
          <div className="sm:col-span-2"><label htmlFor="em-about" className={lbl}>About the company <span className="font-normal text-slate-400">(optional)</span></label><textarea id="em-about" rows={2} value={f.about} onChange={e => set({ about: e.target.value })} className={input} /></div>
          <div><label htmlFor="em-pw" className={lbl}>Password</label><PasswordInput id="em-pw" value={f.password} onChange={v => set({ password: v })} autoComplete="new-password" /></div>
          <div><label htmlFor="em-pw2" className={lbl}>Confirm password</label><PasswordInput id="em-pw2" value={f.confirm} onChange={v => set({ confirm: v })} autoComplete="new-password" /></div>
        </div>
        {f.password && <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><PasswordRules password={f.password} /></div>}
        <HumanCheck key={humanKey} onChange={setHuman} />
        <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={f.consent} onChange={e => set({ consent: e.target.checked })} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          <span>I am authorised to register this company and agree to handle candidate information in line with POPIA.</span>
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">Back</button>
          <button type="submit" disabled={busy} className={btnPrimary}>{busy && <RefreshCw className="w-4 h-4 animate-spin" />}{busy ? 'Creating...' : 'Create employer account'}</button>
        </div>
        <p className="text-sm text-slate-500 text-center">Already registered? <button type="button" onClick={onSignIn} className="font-semibold text-emerald-700 hover:underline cursor-pointer">Sign in</button></p>
      </form>
    </Modal>
  );
};
