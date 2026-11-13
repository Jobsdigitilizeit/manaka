import React from 'react';
import { UserProfile, CompanyProfile } from '../types';
import { Briefcase, Sparkles, UserCheck, ShieldCheck, FileText, Compass, KeyRound, LogOut, Activity, Building2 } from 'lucide-react';

interface HeaderProps {
  role: 'user' | 'admin' | 'employer';
  activeTab: 'skills' | 'matches' | 'roadmap' | 'jobs' | 'applications' | 'admin' | 'employer';
  setActiveTab: (tab: any) => void;
  currentUser?: UserProfile | null;
  currentCompany?: CompanyProfile | null;
  applicationCount?: number;
  /** Shown next to the sign-out button, e.g. the signed-in person's name or email. */
  accountLabel?: string;
  onChangePassword?: () => void;
  onSignOut: () => void;
}

const AccountActions: React.FC<{ label?: string; onChangePassword?: () => void }> = ({ label, onChangePassword }) => (
  <>
    {label && (
      <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-700 font-bold max-w-[220px]" title={label}>
        <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] shrink-0">{label.slice(0, 1).toUpperCase()}</span>
        <span className="truncate">{label}</span>
      </div>
    )}
    {onChangePassword && (
      <button
        onClick={onChangePassword}
        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
        title="Change password"
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Password</span>
      </button>
    )}
  </>
);

export const Header: React.FC<HeaderProps> = ({
  role,
  activeTab,
  setActiveTab,
  currentUser,
  currentCompany,
  applicationCount = 0,
  accountLabel,
  onChangePassword,
  onSignOut,
}) => {
  // 1. EMPLOYER / COMPANY HEADER
  if (role === 'employer') {
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 text-slate-900 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Employer Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xs">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">
                    SKILLIX EMPLOYER
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Talent & Job Portal
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                  South African Enterprise Recruitment, ATS Pipeline & Candidate Profile Broadcasting
                </p>
              </div>
            </div>

            {/* Employer Actions */}
            <div className="flex items-center space-x-3">
              <AccountActions label={accountLabel || currentCompany?.name} onChangePassword={onChangePassword} />

              <button
                onClick={onSignOut}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                title="Sign out of Employer Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // 2. ADMIN HEADER (Strictly no candidate dropdowns, no candidate tabs, and no user buttons)
  if (role === 'admin') {
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 text-slate-900 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Admin Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs">
                <ShieldCheck className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">
                    SKILLIX ADMIN
                  </span>
                  <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-600 animate-pulse" />
                    Central Database
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                  South African Labour Market Intelligence, Vacancy Telemetry & Auditing
                </p>
              </div>
            </div>

            {/* Admin Actions: Sign Out (Must sign out to access user profile) */}
            <div className="flex items-center space-x-3">
              <AccountActions label={accountLabel} onChangePassword={onChangePassword} />

              <button
                onClick={onSignOut}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                title="Sign out of Admin Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // 2. CANDIDATE / USER HEADER (Strictly no admin portal button, only candidate controls)
  if (!currentUser) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 text-slate-900 shadow-xs">
      {/* Top Banner / Brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xs">
              S
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-2xl tracking-tight text-slate-900">
                  SKILLIX
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ZA
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                AI Skill Analyser & Labour Market Job Matching
              </p>
            </div>
          </div>

          {/* Right Action: Candidate Switcher & Sign Out (No Admin Portal Button) */}
          <div className="flex items-center space-x-3">
            <AccountActions label={accountLabel || currentUser.name} onChangePassword={onChangePassword} />

            {/* Candidate Sign Out Button (Must sign out to access Admin Portal) */}
            <button
              onClick={onSignOut}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer"
              title="Sign out to Home Page"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Candidate Navigation Tabs */}
      <div className="bg-slate-50/90 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1.5 overflow-x-auto py-2 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('skills')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Skill Profile</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'skills' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {currentUser.skills?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('matches')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. AI Job Matches</span>
            </button>

            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'roadmap'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3. Career Roadmap</span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'jobs'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>4. SA Job Market</span>
            </button>

            <button
              onClick={() => setActiveTab('applications')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'applications'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>5. Applications</span>
              {applicationCount > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'applications' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {applicationCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

