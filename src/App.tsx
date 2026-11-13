import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserSkill, JobPosting, SkillGapAnalysis, CompanyProfile, AdminAccount } from './types';
import { api, session, AuthResult } from './services/api';
import { HomePage } from './components/HomePage';
import { Header } from './components/Header';
import { SkillProfileView } from './components/SkillProfileView';
import { JobMatchesView } from './components/JobMatchesView';
import { CareerRoadmapView } from './components/CareerRoadmapView';
import { JobDirectoryView } from './components/JobDirectoryView';
import { ApplicationsView } from './components/ApplicationsView';
import { AdminPortal } from './components/AdminPortal';
import { EmployerPortal } from './components/EmployerPortal';
import { SkillAssessmentModal } from './components/SkillAssessmentModal';
import { JobDetailsModal } from './components/JobDetailsModal';
import { ChangePasswordModal, VerifyEmailPage } from './components/AuthFlows';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type Toast = { message: string; type: 'success' | 'info' | 'error' } | null;

const ToastBanner: React.FC<{ toast: Toast }> = ({ toast }) =>
  toast ? (
    <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5 duration-300" role="status">
      <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold border backdrop-blur-md ${
        toast.type === 'error'
          ? 'bg-rose-50 text-rose-800 border-rose-200'
          : 'bg-emerald-50 text-emerald-900 border-emerald-200'
      }`}>
        {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        <span>{toast.message}</span>
      </div>
    </div>
  ) : null;

export default function App() {
  // Auth state: 'guest' (HomePage) | 'user' (Job Seeker View) | 'admin' (Admin Portal) | 'employer' (Employer Portal)
  const [authRole, setAuthRole] = useState<'guest' | 'user' | 'admin' | 'employer'>('guest');
  const [activeTab, setActiveTab] = useState<'skills' | 'matches' | 'roadmap' | 'jobs' | 'applications' | 'admin' | 'employer'>('skills');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentCompany, setCurrentCompany] = useState<CompanyProfile | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [applicationCount, setApplicationCount] = useState(0);
  const [booting, setBooting] = useState(true);

  // Password change dialog. `forced` is set when an administrator issued the current password.
  const [passwordDialog, setPasswordDialog] = useState<{ forced: boolean } | null>(null);

  // Modals
  const [quizSkill, setQuizSkill] = useState<UserSkill | null>(null);
  const [selectedJobForModal, setSelectedJobForModal] = useState<{
    job: JobPosting;
    analysis?: SkillGapAnalysis;
  } | null>(null);

  const [toast, setToast] = useState<Toast>(null);
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const resetToGuest = useCallback(() => {
    session.clear();
    setAuthRole('guest');
    setCurrentUser(null);
    setCurrentCompany(null);
    setCurrentAdmin(null);
    setApplicationCount(0);
    setPasswordDialog(null);
  }, []);

  // Apply a successful /auth/me or sign-in result to app state.
  const adopt = useCallback(async (res: AuthResult) => {
    if (res.role === 'user' && res.user) {
      setCurrentUser(res.user);
      setAuthRole('user');
      setActiveTab('skills');
      try {
        setApplicationCount((await api.getApplications()).length);
      } catch {
        setApplicationCount(0);
      }
    } else if (res.role === 'employer' && res.company) {
      setCurrentCompany(res.company);
      setAuthRole('employer');
      setActiveTab('employer');
    } else if (res.role === 'admin' && res.admin) {
      setCurrentAdmin(res.admin);
      setAuthRole('admin');
      setActiveTab('admin');
    }
    if (res.mustChangePassword) setPasswordDialog({ forced: true });
  }, []);

  // Restore a previous session on reload; sign out cleanly if the server later rejects the token.
  useEffect(() => {
    session.onExpire(() => {
      resetToGuest();
      showToast('Your session has ended. Please sign in again.', 'info');
    });
    (async () => {
      if (session.token) {
        try {
          const res = await api.me();
          if (res.success) await adopt(res);
          else session.clear();
        } catch {
          session.clear();
        }
      }
      setBooting(false);
    })();
  }, [adopt, resetToGuest, showToast]);

  /* --------------------------- Sign-in callbacks --------------------------- */

  // Every sign-in (job seeker, employer or administrator) arrives here; the server decides the role.
  const handleSignedIn = async (res: AuthResult) => {
    await adopt(res);
    const name = res.user?.name ?? res.company?.name ?? res.admin?.name ?? '';
    showToast(name ? `Welcome, ${name}` : 'Signed in');
  };

  const handleSignOut = () => {
    resetToGuest();
    showToast('Signed out.');
  };

  const handlePasswordChanged = () => {
    setPasswordDialog(null);
    showToast('Password updated. Other devices have been signed out.');
  };

  /* --------------------------- Candidate actions --------------------------- */

  const handleUserUpdate = (updated: UserProfile) => {
    setCurrentUser(updated);
  };

  const handleQuizVerified = async (skillName: string, passed: boolean, score: number) => {
    if (!currentUser) return;
    if (passed) {
      const updatedSkills = currentUser.skills.map(s =>
        s.name.toLowerCase() === skillName.toLowerCase()
          ? { ...s, verifiedByQuiz: true, confidenceScore: Math.max(s.confidenceScore || 80, score) }
          : s
      );
      const updatedUser: UserProfile = { ...currentUser, skills: updatedSkills };
      setCurrentUser(updatedUser);
      try {
        await api.saveUser(updatedUser);
        showToast(`Congratulations! Verified ${skillName} with score ${score}%`);
      } catch {
        showToast('Your result could not be saved. Please try again.', 'error');
      }
    }
    setQuizSkill(null);
  };

  const handleApplyJob = async (job: JobPosting, matchScore: number, coverNotes?: string) => {
    if (!currentUser) return;
    try {
      await api.applyForJob({
        jobId: job.id,
        coverNotes: coverNotes || `Applied with verified profile (${matchScore}% match).`,
      });
      setApplicationCount(prev => prev + 1);
      showToast(`Application submitted to ${job.company} for ${job.title}.`);
    } catch (err: any) {
      showToast(err.message || 'Application could not be submitted.', 'error');
    }
  };

  const passwordModal = passwordDialog && (
    <ChangePasswordModal
      forced={passwordDialog.forced}
      onChanged={handlePasswordChanged}
      onClose={() => setPasswordDialog(null)}
    />
  );
  const openPasswordDialog = () => setPasswordDialog({ forced: false });

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-800">Loading Skillix...</p>
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/verify-email') {
    return <VerifyEmailPage onVerified={handleSignedIn} />;
  }

  // 1. HOME PAGE VIEW (Guest)
  if (authRole === 'guest') {
    return (
      <>
        <ToastBanner toast={toast} />
        <HomePage onSignedIn={handleSignedIn} />
      </>
    );
  }

  // 2. EMPLOYER PORTAL VIEW (Hiring, Job Advertising & Talent Pipeline)
  if (authRole === 'employer') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
        <ToastBanner toast={toast} />
        {passwordModal}

        <Header
          role="employer"
          activeTab="employer"
          setActiveTab={setActiveTab}
          currentCompany={currentCompany}
          accountLabel={currentCompany?.name}
          onChangePassword={openPasswordDialog}
          onSignOut={handleSignOut}
        />

        <main className="flex-1 pb-16">
          <EmployerPortal
            currentCompany={currentCompany}
            onCompanyChange={setCurrentCompany}
          />
        </main>

        <footer className="bg-white border-t border-slate-200 text-center py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs">E</div>
              <span className="font-bold text-slate-800">Skillix Employer & Recruiter Portal</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-medium">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">POPIA & B-BBEE aware</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // 3. ADMIN PORTAL VIEW (Strictly isolated from User profile)
  if (authRole === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
        <ToastBanner toast={toast} />
        {passwordModal}

        <Header
          role="admin"
          activeTab="admin"
          setActiveTab={setActiveTab}
          accountLabel={currentAdmin?.email}
          onChangePassword={openPasswordDialog}
          onSignOut={handleSignOut}
        />

        <main className="flex-1 pb-16">
          <AdminPortal currentAdmin={currentAdmin} />
        </main>

        <footer className="bg-white border-t border-slate-200 text-center py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-black text-xs">A</div>
              <span className="font-bold text-slate-800">Skillix Central Administrator Portal</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-medium">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">POPIA aware</span>
              <span>•</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">All admin actions are audit-logged</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // 4. CANDIDATE / USER PROFILE VIEW (Strictly isolated from Admin portal)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <ToastBanner toast={toast} />
      {passwordModal}

      <Header
        role="user"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        applicationCount={applicationCount}
        accountLabel={currentUser?.name}
        onChangePassword={openPasswordDialog}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'skills' && currentUser && (
          <SkillProfileView
            user={currentUser}
            onUserUpdate={handleUserUpdate}
            onOpenQuiz={(skill) => setQuizSkill(skill)}
            onNavigateToMatches={() => setActiveTab('matches')}
          />
        )}

        {activeTab === 'matches' && currentUser && (
          <JobMatchesView
            user={currentUser}
            onApplyJob={handleApplyJob}
            onViewJobDetails={(job, analysis) => setSelectedJobForModal({ job, analysis })}
            onNavigateToRoadmap={() => setActiveTab('roadmap')}
          />
        )}

        {activeTab === 'roadmap' && currentUser && <CareerRoadmapView user={currentUser} />}

        {activeTab === 'jobs' && currentUser && (
          <JobDirectoryView
            user={currentUser}
            onApplyJob={handleApplyJob}
            onViewJobDetails={(job) => setSelectedJobForModal({ job })}
          />
        )}

        {activeTab === 'applications' && currentUser && (
          <ApplicationsView user={currentUser} onNavigateToJobs={() => setActiveTab('matches')} />
        )}
      </main>

      {quizSkill && (
        <SkillAssessmentModal skill={quizSkill} onClose={() => setQuizSkill(null)} onVerified={handleQuizVerified} />
      )}

      {selectedJobForModal && currentUser && (
        <JobDetailsModal
          job={selectedJobForModal.job}
          user={currentUser}
          analysis={selectedJobForModal.analysis}
          onClose={() => setSelectedJobForModal(null)}
          onApply={handleApplyJob}
        />
      )}

      <footer className="bg-white border-t border-slate-200 text-center py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>
            <span className="font-bold text-slate-800">Skillix South Africa</span> — AI Labour Market Decision-Support & Skills Analyser
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-medium">
            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">NQF & SETA aligned</span>
            <span>•</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">POPIA aware</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
