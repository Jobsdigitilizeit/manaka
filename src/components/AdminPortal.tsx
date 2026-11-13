import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, JobPosting, JobApplication, LaborMarketAnalytics, SystemAuditLog, ApplicationStatus, UserSkill, AdminAccount } from '../types';
import { AccountsManager } from './admin/AccountsManager';
import { ApplicationTracker } from './admin/ApplicationTracker';
import { ReportsCenter } from './admin/ReportsCenter';
import { api } from '../services/api';
import { generateSkillsGapReportPDF } from '../utils/pdfGenerator';
import { exportToCSV, exportToJSON } from '../utils/exportUtils';
import {
  BarChart3,
  Users,
  Briefcase,
  FileCheck,
  Download,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Search,
  CheckCircle2,
  Building,
  MapPin,
  Coins,
  Activity,
  Layers,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit,
  SlidersHorizontal,
  RefreshCw,
  KeyRound,
  UserX,
  UserCheck,
  RotateCcw,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Plus,
  Filter
} from 'lucide-react';

interface AdminPortalProps {
  currentAdmin?: AdminAccount | null;
  onRefreshAll?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentAdmin }) => {
  const [adminTab, setAdminTab] = useState<'overview' | 'accounts' | 'applications' | 'candidates' | 'jobs' | 'analytics' | 'fairness' | 'journal' | 'reports'>('overview');

  const [analytics, setAnalytics] = useState<LaborMarketAnalytics | null>(null);
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Filter state for candidates
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateProvince, setCandidateProvince] = useState('all');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<'all' | 'active' | 'revoked'>('all');

  // Candidate Management Modals State
  const [editingCandidate, setEditingCandidate] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UserProfile>>({});
  const [editSkillsText, setEditSkillsText] = useState('');

  const [passwordModalCandidate, setPasswordModalCandidate] = useState<UserProfile | null>(null);
  const [customPasswordInput, setCustomPasswordInput] = useState('');
  const [activeNewPassword, setActiveNewPassword] = useState<string | null>(null);
  const [copiedPasskey, setCopiedPasskey] = useState(false);

  const [revokeModalCandidate, setRevokeModalCandidate] = useState<UserProfile | null>(null);
  const [revokeReasonInput, setRevokeReasonInput] = useState('');

  const [deleteCandidateTarget, setDeleteCandidateTarget] = useState<UserProfile | null>(null);

  // Custom Real-Time Journal Entry Modal
  const [showAddJournalModal, setShowAddJournalModal] = useState(false);
  const [journalActorInput, setJournalActorInput] = useState(currentAdmin ? `Admin (${currentAdmin.email})` : 'Administrator');
  const [journalEventTypeInput, setJournalEventTypeInput] = useState<SystemAuditLog['eventType']>('REALTIME_JOURNAL_ENTRY');
  const [journalDescInput, setJournalDescInput] = useState('');
  const [journalFilterType, setJournalFilterType] = useState<string>('ALL');
  const [journalSearch, setJournalSearch] = useState('');

  // New Job Modal state
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobCompany, setNewJobCompany] = useState('');
  const [newJobSector, setNewJobSector] = useState<JobPosting['sector']>('Software & Tech');
  const [newJobCity, setNewJobCity] = useState('Johannesburg');
  const [newJobProvince, setNewJobProvince] = useState('Gauteng');
  const [newJobWorkModel, setNewJobWorkModel] = useState<JobPosting['workModel']>('Hybrid');
  const [newJobSalaryMin, setNewJobSalaryMin] = useState(0);
  const [newJobSalaryMax, setNewJobSalaryMax] = useState(0);
  const [newJobNqf, setNewJobNqf] = useState(7);
  const [newJobExpYears, setNewJobExpYears] = useState(3);
  const [newJobSkills, setNewJobSkills] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');

  const showNotification = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  }, []);

  const loadData = async () => {
    try {
      const [analyticsData, usersData, jobsData, appsData, logsData] = await Promise.all([
        api.getAnalytics(),
        api.getUsers(),
        api.getJobs(),
        api.getApplications(),
        api.getAuditLogs()
      ]);
      setAnalytics(analyticsData);
      setCandidates(usersData);
      setJobs(jobsData);
      setApplications(appsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s live poll for real-time journaling
    return () => clearInterval(interval);
  }, []);

  // Update Application Status
  const handleUpdateAppStatus = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      await api.updateApplicationStatus(appId, newStatus);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      showNotification(`Application updated to "${newStatus}" in real-time.`);
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
      showNotification('Failed to update application status.', 'error');
    }
  };

  // --- CANDIDATE EDIT HANDLERS ---
  const handleOpenEditCandidate = (candidate: UserProfile) => {
    setEditingCandidate(candidate);
    setEditFormData({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      city: candidate.city,
      province: candidate.province,
      headline: candidate.headline,
      bio: candidate.bio,
      nqfLevel: candidate.nqfLevel,
      totalExperienceYears: candidate.totalExperienceYears,
      expectedSalaryZAR: candidate.expectedSalaryZAR,
      isEE: candidate.isEE,
    });
    setEditSkillsText(candidate.skills.map(s => s.name).join(', '));
  };

  const handleSaveEditCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;

    // Parse updated skills
    const rawSkillNames = editSkillsText.split(',').map(s => s.trim()).filter(Boolean);
    const existingSkillMap = new Map<string, UserSkill>();
    editingCandidate.skills.forEach(s => {
      existingSkillMap.set(s.name.toLowerCase(), s);
    });

    const updatedSkills: UserSkill[] = rawSkillNames.map(name => {
      const existing = existingSkillMap.get(name.toLowerCase());
      if (existing) {
        return {
          name,
          category: existing.category,
          proficiency: existing.proficiency,
          verifiedByQuiz: existing.verifiedByQuiz,
          yearsOfExperience: existing.yearsOfExperience,
          confidenceScore: existing.confidenceScore
        };
      }
      return {
        name,
        category: 'technical',
        proficiency: 'Intermediate',
        verifiedByQuiz: false,
        yearsOfExperience: 2,
        confidenceScore: 85
      };
    });

    const payload: Partial<UserProfile> = {
      ...editFormData,
      skills: updatedSkills
    };

    try {
      const updated = await api.updateUser(editingCandidate.id, payload);
      setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingCandidate(null);
      showNotification(`Updated profile details for candidate "${updated.name}" successfully.`);
      loadData();
    } catch (err) {
      console.error('Failed to update candidate:', err);
      showNotification('Failed to save candidate changes.', 'error');
    }
  };

  // --- CANDIDATE REVOCATION / REACTIVATION ---
  const handleToggleRevokePrompt = (candidate: UserProfile) => {
    setRevokeModalCandidate(candidate);
    setRevokeReasonInput(candidate.status === 'revoked' ? '' : 'Compliance or identity verification review');
  };

  const handleConfirmRevoke = async () => {
    if (!revokeModalCandidate) return;
    const isCurrentlyRevoked = revokeModalCandidate.status === 'revoked';
    const nextStatus = isCurrentlyRevoked ? 'active' : 'revoked';

    try {
      const updated = await api.updateUserStatus(revokeModalCandidate.id, nextStatus, revokeReasonInput);
      setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
      setRevokeModalCandidate(null);
      showNotification(
        nextStatus === 'active'
          ? `Reactivated candidate account for ${updated.name}.`
          : `Revoked candidate account for ${updated.name}.`
      );
      loadData();
    } catch (err) {
      console.error('Failed to change user status:', err);
      showNotification('Failed to update account status.', 'error');
    }
  };

  // --- PASSWORD RESET HANDLER ---
  const handleOpenPasswordReset = (candidate: UserProfile) => {
    setPasswordModalCandidate(candidate);
    setActiveNewPassword(null);
    setCustomPasswordInput('');
    setCopiedPasskey(false);
  };

  const handleExecutePasswordReset = async () => {
    if (!passwordModalCandidate) return;
    try {
      const res = await api.resetUserPassword(passwordModalCandidate.id, customPasswordInput || undefined);
      setActiveNewPassword(res.password);
      setCandidates(prev => prev.map(c => c.id === res.user.id ? res.user : c));
      showNotification(`Security passkey reset generated for ${passwordModalCandidate.name}.`);
      loadData();
    } catch (err) {
      console.error('Password reset failed:', err);
      showNotification((err as Error)?.message || 'Failed to reset candidate password.', 'error');
    }
  };

  const handleCopyPasskey = () => {
    if (!activeNewPassword) return;
    navigator.clipboard.writeText(activeNewPassword);
    setCopiedPasskey(true);
    setTimeout(() => setCopiedPasskey(false), 3000);
  };

  // --- CANDIDATE REMOVAL HANDLER ---
  const handleConfirmDeleteCandidate = async () => {
    if (!deleteCandidateTarget) return;
    try {
      await api.deleteUser(deleteCandidateTarget.id);
      setCandidates(prev => prev.filter(c => c.id !== deleteCandidateTarget.id));
      setApplications(prev => prev.filter(a => a.userId !== deleteCandidateTarget.id));
      showNotification(`Permanently removed candidate "${deleteCandidateTarget.name}" and their applications.`);
      setDeleteCandidateTarget(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete candidate:', err);
      showNotification('Failed to delete candidate.', 'error');
    }
  };

  // --- REAL-TIME JOURNAL SUBMIT HANDLER ---
  const handleCreateJournalEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalDescInput.trim()) return;

    try {
      const res = await api.recordJournalEntry({
        actor: journalActorInput || 'Administrator',
        eventType: journalEventTypeInput,
        description: journalDescInput,
      });
      setShowAddJournalModal(false);
      setJournalDescInput('');
      showNotification('Recorded real-time journal entry successfully.');
      loadData();
    } catch (err) {
      console.error('Failed to record journal entry:', err);
      showNotification('Failed to record entry in journal.', 'error');
    }
  };

  // --- VACANCY MANAGEMENT HANDLERS ---
  const handleGenerateJobAI = async () => {
    if (!newJobTitle.trim()) {
      alert('Please enter a Job Title first.');
      return;
    }
    setIsGeneratingWithAI(true);
    try {
      const generated = await api.generateJobWithAI({
        title: newJobTitle,
        sector: newJobSector,
        city: `${newJobCity}, ${newJobProvince}`,
        keySkills: newJobSkills
      });
      if (generated) {
        setNewJobDesc(generated.description || '');
        if (generated.requiredSkills) setNewJobSkills(generated.requiredSkills.join(', '));
        if (generated.salaryMinZAR) setNewJobSalaryMin(generated.salaryMinZAR);
        if (generated.salaryMaxZAR) setNewJobSalaryMax(generated.salaryMaxZAR);
      }
    } catch (err) {
      console.error('Failed to generate with AI:', err);
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle || !newJobCompany) {
      alert('Please provide title and company.');
      return;
    }

    const skillsArray = newJobSkills.split(',').map(s => s.trim()).filter(Boolean);

    const newJobPayload: Partial<JobPosting> = {
      title: newJobTitle,
      company: newJobCompany,
      sector: newJobSector,
      city: `${newJobCity}, ${newJobProvince}`,
      province: newJobProvince,
      workModel: newJobWorkModel,
      employmentType: 'Full-time',
      salaryMinZAR: Number(newJobSalaryMin),
      salaryMaxZAR: Number(newJobSalaryMax),
      salaryPeriod: 'monthly',
      nqfLevelRequired: Number(newJobNqf),
      minExperienceYears: Number(newJobExpYears),
      requiredSkills: skillsArray,
      preferredSkills: ['Agile / Scrum', 'POPIA Security'],
      description: newJobDesc || `Exciting career opportunity at ${newJobCompany} in ${newJobCity}.`,
      responsibilities: [
        'Deliver high-quality software and technical solutions.',
        'Collaborate with agile cross-functional teams in South Africa.',
        'Maintain regulatory and POPIA compliance.'
      ],
      requirements: [
        `NQF Level ${newJobNqf} in relevant field.`,
        `${newJobExpYears}+ years proven industry track record.`,
        `Demonstrated mastery in ${newJobSkills}.`
      ],
      bbbeeLevel: 'Level 1 Contributor',
      setaAccredited: true
    };

    try {
      const created = await api.createJob(newJobPayload);
      setJobs(prev => [created, ...prev]);
      setShowNewJobModal(false);
      setNewJobTitle('');
      setNewJobCompany('');
      setNewJobDesc('');
      showNotification(`Vacancy published: ${created.title} at ${created.company}.`);
      loadData();
    } catch (err) {
      console.error('Failed to create job:', err);
      showNotification('Failed to publish vacancy.', 'error');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to remove this job vacancy?')) return;
    try {
      await api.deleteJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      showNotification('Vacancy deleted.');
      loadData();
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  // --- FILTERED ARRAYS ---
  const activeCandidateCount = candidates.filter(c => c.status !== 'revoked').length;
  const revokedCandidateCount = candidates.filter(c => c.status === 'revoked').length;

  const filteredCandidates = candidates.filter(c => {
    if (candidateProvince !== 'all' && c.province !== candidateProvince) return false;
    if (candidateStatusFilter === 'active' && c.status === 'revoked') return false;
    if (candidateStatusFilter === 'revoked' && c.status !== 'revoked') return false;

    if (candidateSearch.trim() !== '') {
      const q = candidateSearch.toLowerCase();
      const hasSkill = c.skills.some(s => s.name.toLowerCase().includes(q));
      const hasName = c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      return hasSkill || hasName;
    }
    return true;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    if (journalFilterType !== 'ALL') {
      if (journalFilterType === 'USER_MGMT' && !['USER_REGISTRATION', 'USER_UPDATED', 'USER_DELETED'].includes(log.eventType)) return false;
      if (journalFilterType === 'SECURITY' && !['PASSWORD_RESET', 'ACCOUNT_REVOKED', 'ACCOUNT_REACTIVATED'].includes(log.eventType)) return false;
      if (journalFilterType === 'APPLICATIONS' && !['APPLICATION_SUBMITTED', 'APPLICATION_STATUS_CHANGED'].includes(log.eventType)) return false;
      if (journalFilterType === 'SYSTEM_OPS' && !['FAIRNESS_AUDIT', 'SYSTEM_POLICY_AUDIT', 'REALTIME_JOURNAL_ENTRY', 'EMPLOYER_REGISTRATION', 'EMPLOYER_LOGIN'].includes(log.eventType)) return false;
      if (journalFilterType === 'AI_ACTIONS' && !['AI_SKILL_EXTRACTION', 'AI_JOB_MATCH', 'FAIRNESS_AUDIT'].includes(log.eventType)) return false;
    }
    if (journalSearch.trim() !== '') {
      const q = journalSearch.toLowerCase();
      return (
        log.actor.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.eventType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Banner Feedback */}
      {feedbackMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold border backdrop-blur-md ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}>
            {feedbackMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{feedbackMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Banner & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Skillix Administrator & Labour Intelligence Portal
            </h1>
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Real-Time Live Database
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage accounts and passwords, track every application, review the audit trail and download PDF reports.
          </p>
        </div>

        {/* Action Controls: Refresh / Export */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => analytics && generateSkillsGapReportPDF(analytics, analytics.topShortageSkills, analytics.topDemandedSkills)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Skills Gap PDF</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh Live Database"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation for Admin Modules */}
      <div className="flex space-x-2 overflow-x-auto p-1.5 bg-slate-200/60 rounded-2xl text-xs font-bold scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'accounts', label: 'Users & Access', icon: KeyRound },
          { id: 'applications', label: 'Application Tracker', icon: FileCheck, count: applications.length },
          { id: 'candidates', label: 'Talent Pool', icon: Users, count: candidates.length },
          { id: 'jobs', label: 'Vacancies', icon: Briefcase, count: jobs.length },
          { id: 'analytics', label: 'Skills Intelligence', icon: BarChart3 },
          { id: 'fairness', label: 'Responsible AI', icon: ShieldCheck },
          { id: 'journal', label: 'Audit Journal', icon: Clock, count: auditLogs.length },
          { id: 'reports', label: 'Reports (PDF)', icon: FileSpreadsheet }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-slate-900 font-extrabold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-300 text-slate-700'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: EXECUTIVE OVERVIEW --- */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric KPI Bento Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Active Job Seekers</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {candidates.length}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{activeCandidateCount} Active Candidates • Real-Time</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Verified SA Vacancies</span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {jobs.length}
              </div>
              <div className="text-[11px] text-blue-700 mt-1 font-bold">
                Across {new Set(jobs.map(j => j.sector)).size} sector(s)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Applications</span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {applications.length}
              </div>
              <div className="text-[11px] text-purple-700 mt-1 font-bold">
                {applications.filter(a => a.status === 'Shortlisted').length} Shortlisted Candidates
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">AI Fairness Score</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-2">
                {analytics?.ethicalFairnessScore != null ? `${analytics.ethicalFairnessScore}%` : 'Not measured'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                {analytics?.ethicalFairnessScore != null ? 'From bias-audit results' : 'No bias audit has been run yet'}
              </div>
            </div>
          </div>

          {/* Live Reflection: Real-Time Applications & Audits */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Active Application Pipeline */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time Candidate Applications Stream</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">{applications.length} Received</span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {applications.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No active applications in the stream. Applications submitted by candidates will appear here in real-time.
                  </div>
                ) : (
                  applications.map(app => (
                    <div key={app.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-slate-900">{app.userName}</span>
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                            {app.overallMatchScore}% Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-bold mt-0.5">{app.jobTitle} • {app.company}</p>
                        <span className="text-[11px] text-slate-500 font-medium">{app.appliedAt} • {app.userCity} (NQF {app.userNqfLevel})</span>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value as ApplicationStatus)}
                          className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 shadow-2xs focus:outline-none cursor-pointer"
                        >
                          <option value="Under Review">Under Review</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview Scheduled">Interview Scheduled</option>
                          <option value="Assessment Sent">Assessment Sent</option>
                          <option value="Offered">Offered</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right 5 cols: Live System Audit Activity Stream */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span>Real-Time Central Audit & Journal</span>
                </h3>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900">{log.actor}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.slice(11)}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-snug font-medium">{log.description}</p>
                    <span className="inline-block text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-mono font-bold">
                      {log.eventType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'accounts' && (
        <AccountsManager currentAdmin={currentAdmin ?? null} notify={showNotification} onChanged={loadData} />
      )}

      {adminTab === 'applications' && (
        <ApplicationTracker applications={applications} onRefresh={loadData} notify={showNotification} />
      )}

      {/* --- TAB 2: CANDIDATE TALENT POOL & USER ACCOUNT MANAGEMENT --- */}
      {adminTab === 'candidates' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            {/* Candidate Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, email, city, skill (e.g. TypeScript, Python)..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                <select
                  value={candidateStatusFilter}
                  onChange={(e) => setCandidateStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Accounts</option>
                  <option value="active">Active Only</option>
                  <option value="revoked">Revoked / Suspended Only</option>
                </select>

                <select
                  value={candidateProvince}
                  onChange={(e) => setCandidateProvince(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Provinces</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="Western Cape">Western Cape</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportToCSV(candidates, 'Skillix_Candidates_Talent_Pool')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Talent CSV</span>
                </button>
              </div>
            </div>

            {/* Candidates Table with Management Actions */}
            <div className="overflow-x-auto mt-4">
              {filteredCandidates.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No candidates match the current filters.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Candidate & Credentials</th>
                      <th className="p-3">Location & NQF</th>
                      <th className="p-3">Account Status</th>
                      <th className="p-3">Skills & Experience</th>
                      <th className="p-3">Expected Salary</th>
                      <th className="p-3 text-right">Account Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((cand) => {
                      const isRevoked = cand.status === 'revoked';
                      return (
                        <tr key={cand.id} className={`hover:bg-slate-50/80 transition-colors ${isRevoked ? 'bg-rose-50/40' : ''}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{cand.name}</span>
                              {cand.status === 'active' ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">Live Profile</span>
                              ) : (
                                <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">Suspended</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium">{cand.headline}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{cand.email}</span>
                              {cand.phone && <span>• {cand.phone}</span>}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-800">{cand.city}, {cand.province}</div>
                            <span className="inline-block mt-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.2 rounded-full font-bold">
                              NQF Level {cand.nqfLevel}
                            </span>
                          </td>

                          <td className="p-3">
                            {isRevoked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <UserX className="w-3 h-3 text-rose-600" />
                                <span>REVOKED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                <span>ACTIVE</span>
                              </span>
                            )}
                            {cand.statusReason && (
                              <div className="text-[10px] text-slate-400 mt-1 max-w-[130px] truncate" title={cand.statusReason}>
                                {cand.statusReason}
                              </div>
                            )}
                          </td>

                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-slate-800 text-[11px] mb-1">
                              {cand.totalExperienceYears} Years Experience
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {cand.skills.slice(0, 3).map(s => (
                                <span key={s.name} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-[9px] font-bold">
                                  {s.name}
                                </span>
                              ))}
                              {cand.skills.length > 3 && (
                                <span className="text-[9px] text-slate-400 font-bold">+{cand.skills.length - 3}</span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="font-bold text-emerald-700 text-xs">
                              R{(cand.expectedSalaryZAR || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 block">per month</span>
                          </td>

                          {/* ACTION BUTTONS: Edit Details, Revoke/Reactivate, Reset Password, Remove */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Edit Details Button */}
                              <button
                                onClick={() => handleOpenEditCandidate(cand)}
                                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="Edit Candidate Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Reset Password Button */}
                              <button
                                onClick={() => handleOpenPasswordReset(cand)}
                                className="p-2 rounded-xl text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Reset User Password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Revoke / Reactivate Button */}
                              <button
                                onClick={() => handleToggleRevokePrompt(cand)}
                                className={`p-2 rounded-xl transition-colors ${
                                  isRevoked
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-amber-600 hover:bg-amber-50'
                                }`}
                                title={isRevoked ? 'Reactivate Account' : 'Revoke Account'}
                              >
                                {isRevoked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                              </button>

                              {/* Delete Account Button */}
                              <button
                                onClick={() => setDeleteCandidateTarget(cand)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Permanently Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: VACANCIES & JOB POSTINGS MANAGEMENT --- */}
      {adminTab === 'jobs' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Active South African Vacancies</h3>
                <p className="text-xs text-slate-500">{jobs.length} postings in live database</p>
              </div>

              <button
                onClick={() => setShowNewJobModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Create Vacancy (with AI JD Generator)</span>
              </button>
            </div>

            {/* Vacancy Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Job Role & Employer</th>
                    <th className="p-3">Sector & Location</th>
                    <th className="p-3">Monthly ZAR Package</th>
                    <th className="p-3">NQF Level</th>
                    <th className="p-3">Applicants</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{job.title}</span>
                          <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-bold uppercase">Active Vacancy</span>
                        </div>
                        <div className="text-xs text-slate-600 font-bold">{job.company}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800">{job.sector}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{job.city} ({job.workModel})</div>
                      </td>

                      <td className="p-3 font-bold text-emerald-700">
                        R{job.salaryMinZAR.toLocaleString()} - R{job.salaryMaxZAR.toLocaleString()}
                      </td>

                      <td className="p-3 font-bold text-slate-700">
                        NQF {job.nqfLevelRequired}+
                      </td>

                      <td className="p-3">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {job.applicantCount} Applicants
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete vacancy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: SA SKILLS GAP & MARKET INTELLIGENCE --- */}
      {adminTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Top In-Demand vs Shortage Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* In-Demand High Growth Skills */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Top In-Demand Competencies in SA</span>
                </h3>
                <span className="text-[11px] text-emerald-700 font-bold">Vacancy Mentions</span>
              </div>

              <div className="space-y-3">
                {analytics.topDemandedSkills.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-xl bg-slate-200 text-slate-800 font-black flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{item.skill}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-500 font-semibold">{item.count} Vacancies</span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {item.growthRate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acute Shortage Gaps */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Acute Labour Market Shortages & Deficits</span>
                </h3>
                <span className="text-[11px] text-rose-700 font-bold">Shortage Gap %</span>
              </div>

              <div className="space-y-3">
                {analytics.topShortageSkills.map((gap, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{gap.skill}</span>
                      <span className="text-rose-600 font-black">{gap.demandGapPercent}% Shortage Gap</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${gap.demandGapPercent}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Recommendation: Accelerate SETA Bursaries & University WIL
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sector & Salary Breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 mb-4">
              Average Compensation & Sector Distribution (ZAR / Month)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {analytics.sectorDistribution.map((sec, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">{sec.sector}</span>
                  <div className="text-lg font-black text-emerald-700">R{sec.avgSalaryZAR.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-500 font-medium">{sec.count} active vacancies listed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: RESPONSIBLE AI & NIST/OECD FAIRNESS AUDIT --- */}
      {adminTab === 'fairness' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Trustworthy & Bias-Audited AI Framework</h3>
                <p className="text-xs text-slate-500">Aligned with NIST AI RMF, OECD Principles, and South African POPIA Guidelines</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="text-2xl font-black text-slate-500">Not measured</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">Demographic parity</div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">No bias audit has been run on match outcomes yet, so no parity figure is reported. Run one before publishing fairness claims.</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="text-2xl font-black text-blue-700">60 / 20 / 20</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">Application match score weights</div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">Skills 60%, qualification (NQF) 20%, experience 20%. Computed on the server from the profile and vacancy only; the formula uses no demographic fields.</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="text-2xl font-black text-purple-700">Audited</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">Access to personal data</div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">Personal data is only returned to signed-in accounts with the right role, and every administrator action is written to the audit journal.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 6: REAL-TIME CENTRAL EVENT JOURNAL & AUDIT LOGS --- */}
      {adminTab === 'journal' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>Real-Time Event Journal & Governance Registry</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Every user action, profile adjustment, password reset, account revocation, application, and AI decision is registered here in real-time.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddJournalModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Record Custom Journal Note</span>
                </button>

                <button
                  onClick={() => exportToJSON(auditLogs, 'Skillix_RealTime_Event_Journal')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search journal by actor, description, event..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto overflow-x-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                {['ALL', 'USER_MGMT', 'SECURITY', 'APPLICATIONS', 'SYSTEM_OPS', 'AI_ACTIONS'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setJournalFilterType(cat)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      journalFilterType === cat
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Journal Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Actor / Origin</th>
                    <th className="p-3">Journal Description & Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          log.eventType.includes('REVOKED') || log.eventType.includes('DELETED') || log.eventType.includes('PURGED')
                            ? 'bg-rose-100 text-rose-800'
                            : log.eventType.includes('PASSWORD') || log.eventType.includes('REACTIVATED')
                            ? 'bg-amber-100 text-amber-800'
                            : log.eventType.includes('USER')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-900 font-bold whitespace-nowrap">{log.actor}</td>
                      <td className="p-3 text-slate-700">
                        <div>{log.description}</div>
                        {log.details && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-md">
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 7: REPORTS & DATA EXPORT CENTER --- */}
      {adminTab === 'reports' && (
        <ReportsCenter analytics={analytics} auditLogs={auditLogs} adminLabel={currentAdmin?.email ?? 'Administrator'} notify={showNotification} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT CANDIDATE DETAILS                                           */}
      {/* ========================================================================= */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 text-slate-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-500" />
                <span>Edit Candidate Details: {editingCandidate.name}</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{editingCandidate.id}</span>
            </div>

            <form onSubmit={handleSaveEditCandidateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">City</label>
                  <input
                    type="text"
                    value={editFormData.city || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Province</label>
                  <select
                    value={editFormData.province || 'Gauteng'}
                    onChange={(e) => setEditFormData({ ...editFormData, province: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Gauteng">Gauteng</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Limpopo">Limpopo</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="North West">North West</option>
                    <option value="Northern Cape">Northern Cape</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Professional Headline</label>
                <input
                  type="text"
                  value={editFormData.headline || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">NQF Qualification Level</label>
                  <select
                    value={editFormData.nqfLevel || 7}
                    onChange={(e) => setEditFormData({ ...editFormData, nqfLevel: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="4">NQF 4 (Matric / Grade 12)</option>
                    <option value="5">NQF 5 (Higher Certificate)</option>
                    <option value="6">NQF 6 (Diploma / Adv. Cert)</option>
                    <option value="7">NQF 7 (Bachelor's Degree)</option>
                    <option value="8">NQF 8 (Honours / Postgrad)</option>
                    <option value="9">NQF 9 (Master's Degree)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Experience (Years)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editFormData.totalExperienceYears ?? 2}
                    onChange={(e) => setEditFormData({ ...editFormData, totalExperienceYears: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expected Salary (ZAR/pm)</label>
                  <input
                    type="number"
                    step="1000"
                    value={editFormData.expectedSalaryZAR ?? 45000}
                    onChange={(e) => setEditFormData({ ...editFormData, expectedSalaryZAR: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Skills Inventory (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editSkillsText}
                  onChange={(e) => setEditSkillsText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Professional Bio / Summary</label>
                <textarea
                  rows={3}
                  value={editFormData.bio || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESET PASSWORD                                                   */}
      {/* ========================================================================= */}
      {passwordModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reset Candidate Password</h3>
                <p className="text-xs text-slate-500">{passwordModalCandidate.name} ({passwordModalCandidate.email})</p>
              </div>
            </div>

            {activeNewPassword ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    New Generated Security Passkey:
                  </span>
                  <div className="flex items-center justify-between bg-white border border-emerald-300 rounded-xl p-3">
                    <span className="font-mono font-black text-base text-slate-900 select-all">
                      {activeNewPassword}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPasskey}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      {copiedPasskey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPasskey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-700">
                    The candidate can now use this security passkey to log in. This reset has been recorded in the central audit journal.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setPasswordModalCandidate(null)}
                    className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Generate a master security passkey or enter a custom temporary password for <strong>{passwordModalCandidate.name}</strong>.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Custom Password (Optional - Leave blank for auto-generation)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SKLX-ZA-2026"
                    value={customPasswordInput}
                    onChange={(e) => setCustomPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalCandidate(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePasswordReset}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold uppercase tracking-wider"
                  >
                    Issue Password Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REVOKE / REACTIVATE ACCOUNT                                      */}
      {/* ========================================================================= */}
      {revokeModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                revokeModalCandidate.status === 'revoked' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {revokeModalCandidate.status === 'revoked' ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {revokeModalCandidate.status === 'revoked' ? 'Reactivate Account' : 'Revoke / Suspend Account'}
                </h3>
                <p className="text-xs text-slate-500">{revokeModalCandidate.name} ({revokeModalCandidate.email})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {revokeModalCandidate.status === 'revoked'
                ? `Reactivating this account will restore full candidate access to job matching, career roadmaps, and application submissions.`
                : `Revoking this account will prevent the candidate from submitting new applications. Their profile will be marked as REVOKED in the admin roster.`
              }
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Reason for Action (Journaled)
              </label>
              <input
                type="text"
                value={revokeReasonInput}
                onChange={(e) => setRevokeReasonInput(e.target.value)}
                placeholder="e.g. Identity re-verification or policy audit"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeModalCandidate(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold uppercase tracking-wider ${
                  revokeModalCandidate.status === 'revoked'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {revokeModalCandidate.status === 'revoked' ? 'Reactivate Account' : 'Revoke Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CANDIDATE CONFIRMATION                                    */}
      {/* ========================================================================= */}
      {deleteCandidateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Permanently Remove Candidate</h3>
                <p className="text-xs text-slate-500">{deleteCandidateTarget.name} ({deleteCandidateTarget.email})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this user account? All associated application submissions will also be cascaded and purged.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidateTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCandidate}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CREATE CUSTOM REAL-TIME JOURNAL ENTRY                             */}
      {/* ========================================================================= */}
      {showAddJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Record Real-Time Journal Entry</h3>
                <p className="text-xs text-slate-500">Immediate synchronization across system audit trails</p>
              </div>
            </div>

            <form onSubmit={handleCreateJournalEntrySubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Actor / Authority</label>
                <input
                  type="text"
                  required
                  value={journalActorInput}
                  onChange={(e) => setJournalActorInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Event Classification</label>
                <select
                  value={journalEventTypeInput}
                  onChange={(e) => setJournalEventTypeInput(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="REALTIME_JOURNAL_ENTRY">REALTIME_JOURNAL_ENTRY (General Journal)</option>
                  <option value="FAIRNESS_AUDIT">FAIRNESS_AUDIT (Algorithmic Parity Note)</option>
                  <option value="USER_UPDATED">USER_UPDATED (Candidate Record Change)</option>
                  <option value="PASSWORD_RESET">PASSWORD_RESET (Security Key Reset)</option>
                  <option value="ACCOUNT_REVOKED">ACCOUNT_REVOKED (Account Revocation Note)</option>
                  <option value="JOB_CREATED">JOB_CREATED (Vacancy Policy Entry)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Journal Description & Observations</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter detailed compliance or operational notes..."
                  value={journalDescInput}
                  onChange={(e) => setJournalDescInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Register in Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: CREATE JOB WITH AI JD GENERATOR                                   */}
      {/* ========================================================================= */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-slate-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              <span>Post New South African Vacancy</span>
            </h3>

            <form onSubmit={handleCreateJobSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Data Analyst"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Company / Employer</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Capitec Bank"
                    value={newJobCompany}
                    onChange={(e) => setNewJobCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Sector</label>
                  <select
                    value={newJobSector}
                    onChange={(e) => setNewJobSector(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="FinTech & Banking">FinTech & Banking</option>
                    <option value="Software & Tech">Software & Tech</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                    <option value="Renewable Energy">Renewable Energy</option>
                    <option value="Telecommunications">Telecommunications</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Work Model</label>
                  <select
                    value={newJobWorkModel}
                    onChange={(e) => setNewJobWorkModel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">City / Region</label>
                  <input
                    type="text"
                    value={newJobCity}
                    onChange={(e) => setNewJobCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Province</label>
                  <select
                    value={newJobProvince}
                    onChange={(e) => setNewJobProvince(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Gauteng">Gauteng</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Required Skills (Comma separated)</label>
                  <button
                    type="button"
                    onClick={handleGenerateJobAI}
                    disabled={isGeneratingWithAI}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>{isGeneratingWithAI ? 'AI Drafting JD...' : 'Generate with Gemini AI'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newJobSkills}
                  onChange={(e) => setNewJobSkills(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Salary Min (ZAR/pm)</label>
                  <input
                    type="number"
                    value={newJobSalaryMin}
                    onChange={(e) => setNewJobSalaryMin(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Salary Max (ZAR/pm)</label>
                  <input
                    type="number"
                    value={newJobSalaryMax}
                    onChange={(e) => setNewJobSalaryMax(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Role Description</label>
                <textarea
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  rows={3}
                  placeholder="Overview of the opportunity in South Africa..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Save & Publish Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
