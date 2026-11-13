import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Briefcase, 
  Users, 
  Share2, 
  PlusCircle, 
  Search, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  Send, 
  ChevronRight, 
  Filter, 
  Sparkles, 
  AlertCircle, 
  Eye, 
  Mail, 
  Phone, 
  Globe, 
  Award, 
  UserCheck, 
  ArrowUpRight, 
  Check, 
  X,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Building,
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';
import { JOB_SECTORS, JobPosting, UserProfile, CompanyProfile, JobApplication } from '../types';
import { api } from '../services/api';

interface EmployerPortalProps {
  currentCompany: CompanyProfile | null;
  onCompanyChange: (company: CompanyProfile | null) => void;
  onNavigateToJob?: (jobId: string) => void;
  onRecordAudit?: (eventType: string, actor: string, desc: string, details?: any) => void;
}

export const EmployerPortal: React.FC<EmployerPortalProps> = ({
  currentCompany,
  onCompanyChange,
  onRecordAudit
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'post-job' | 'manage-jobs' | 'applicants' | 'talent-search' | 'company-profile'>('overview');
  const [companyJobs, setCompanyJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [talentPool, setTalentPool] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Selected job for sharing modal
  const [shareModalJob, setShareModalJob] = useState<JobPosting | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [shareCustomNote, setShareCustomNote] = useState<string>('');
  const [sharingInProgress, setSharingInProgress] = useState<boolean>(false);

  // Talent search filters
  const [talentQuery, setTalentQuery] = useState<string>('');
  const [talentProvince, setTalentProvince] = useState<string>('all');
  const [talentMinNqf, setTalentMinNqf] = useState<number>(0);
  const [talentEeOnly, setTalentEeOnly] = useState<boolean>(false);
  const [selectedJobForTalentMatch, setSelectedJobForTalentMatch] = useState<string>('');

  // Post new job form state
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobSector, setNewJobSector] = useState('Software & Tech');
  const [newJobCity, setNewJobCity] = useState('Sandton, Johannesburg');
  const [newJobProvince, setNewJobProvince] = useState('Gauteng');
  const [newJobWorkModel, setNewJobWorkModel] = useState<'Remote' | 'Hybrid' | 'On-site'>('Hybrid');
  const [newJobEmploymentType, setNewJobEmploymentType] = useState('Full-time');
  const [newJobSalaryMin, setNewJobSalaryMin] = useState<number>(0);
  const [newJobSalaryMax, setNewJobSalaryMax] = useState<number>(0);
  const [newJobNqf, setNewJobNqf] = useState<number>(7);
  const [newJobExpYears, setNewJobExpYears] = useState<number>(3);
  const [newJobRequiredSkills, setNewJobRequiredSkills] = useState<string>('');
  const [newJobPreferredSkills, setNewJobPreferredSkills] = useState<string>('PostgreSQL, Docker, AWS, POPIA Awareness');
  const [newJobDescription, setNewJobDescription] = useState<string>('');
  const [newJobResponsibilities, setNewJobResponsibilities] = useState<string>('');
  const [newJobRequirements, setNewJobRequirements] = useState<string>('');
  const [newJobBbbeeLevel, setNewJobBbbeeLevel] = useState<string>('Level 1 Contributor');
  const [newJobSetaAccredited, setNewJobSetaAccredited] = useState<boolean>(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [isSubmittingJob, setIsSubmittingJob] = useState<boolean>(false);

  // Load initial companies and active company data
  useEffect(() => {
    loadCompanyData();
  }, [currentCompany?.id]);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      // The signed-in employer only ever works on their own company.
      const activeComp = currentCompany;

      if (activeComp) {
        // Fetch jobs for this company
        const allJobs = await api.getJobs({ includeInactive: true });
        const compSpecificJobs = allJobs.filter(
          j => j.companyId === activeComp!.id || j.company.toLowerCase() === activeComp!.name.toLowerCase()
        );
        setCompanyJobs(compSpecificJobs);

        // Fetch applications
        const apps = await api.getEmployerApplications();
        setApplications(apps);

        // Load talent pool
        const talent = await api.searchEmployerTalent({
          jobId: compSpecificJobs.length > 0 ? compSpecificJobs[0].id : undefined
        });
        setTalentPool(talent);
        if (compSpecificJobs.length > 0 && !selectedJobForTalentMatch) {
          setSelectedJobForTalentMatch(compSpecificJobs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load employer data:', err);
    } finally {
      setLoading(false);
    }
  };

  // AI Job Description Generator
  const handleAIGenerateJobDesc = async () => {
    if (!newJobTitle) {
      setActionError('Please specify a Job Title before generating with AI.');
      setTimeout(() => setActionError(null), 3500);
      return;
    }

    setIsGeneratingAI(true);
    setActionError(null);
    try {
      const generated = await api.generateJobWithAI({
        title: newJobTitle,
        sector: newJobSector as JobPosting['sector'],
        city: newJobCity,
        experienceLevel: `${newJobExpYears}+ years`,
        keySkills: newJobRequiredSkills
      });

      if (generated) {
        setNewJobDescription(generated.description || '');
        if (Array.isArray(generated.responsibilities)) {
          setNewJobResponsibilities(generated.responsibilities.join('\n'));
        }
        if (Array.isArray(generated.requirements)) {
          setNewJobRequirements(generated.requirements.join('\n'));
        }
        if (generated.requiredSkills && Array.isArray(generated.requiredSkills)) {
          setNewJobRequiredSkills(generated.requiredSkills.join(', '));
        }
        if (generated.salaryMinZAR) setNewJobSalaryMin(generated.salaryMinZAR);
        if (generated.salaryMaxZAR) setNewJobSalaryMax(generated.salaryMaxZAR);

        setActionSuccess('AI Job Description generated with South African market benchmarks.');
        setTimeout(() => setActionSuccess(null), 3500);
      }
    } catch (err) {
      setActionError('AI generation failed. Please fill in the fields manually.');
      setTimeout(() => setActionError(null), 3500);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Publish New Job
  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) {
      setActionError('Job Title is required.');
      return;
    }
    if (!currentCompany) {
      setActionError('No active company selected.');
      return;
    }

    setIsSubmittingJob(true);
    setActionError(null);
    try {
      const reqSkills = newJobRequiredSkills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const prefSkills = newJobPreferredSkills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const responsibilitiesList = newJobResponsibilities
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);

      const requirementsList = newJobRequirements
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);

      const jobPayload: Partial<JobPosting> = {
        title: newJobTitle.trim(),
        company: currentCompany.name,
        companyId: currentCompany.id,
        sector: newJobSector as JobPosting['sector'],
        city: newJobCity,
        province: newJobProvince,
        workModel: newJobWorkModel,
        employmentType: newJobEmploymentType as JobPosting['employmentType'],
        salaryMinZAR: Number(newJobSalaryMin) || 45000,
        salaryMaxZAR: Number(newJobSalaryMax) || 75000,
        salaryPeriod: 'monthly',
        nqfLevelRequired: Number(newJobNqf) || 7,
        minExperienceYears: Number(newJobExpYears) || 2,
        requiredSkills: reqSkills.length > 0 ? reqSkills : ['Problem Solving', 'Communication'],
        preferredSkills: prefSkills,
        description: newJobDescription.trim() || `Exciting career opportunity at ${currentCompany.name} in ${newJobCity}.`,
        responsibilities: responsibilitiesList.length > 0 ? responsibilitiesList : [
          'Deliver domain solutions and collaborate with agile product squads.',
          'Adhere to high software quality and South African regulatory standards.'
        ],
        requirements: requirementsList.length > 0 ? requirementsList : [
          `NQF Level ${newJobNqf} qualification or equivalent relevant industry experience.`,
          `${newJobExpYears}+ years hands-on experience in the field.`
        ],
        bbbeeLevel: newJobBbbeeLevel,
        setaAccredited: newJobSetaAccredited,
        active: true,
        sharedWithCandidateIds: [],
        viewsCount: 0,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      };

      const created = await api.createJob(jobPayload);
      setCompanyJobs(prev => [created, ...prev]);

      if (onRecordAudit) {
        onRecordAudit(
          'JOB_CREATED',
          `Employer: ${currentCompany.name}`,
          `Published new job listing: "${created.title}" at ${created.city}.`,
          { jobId: created.id, companyId: currentCompany.id }
        );
      }

      setActionSuccess(`Successfully published "${created.title}" to Skillix SA Job Market!`);
      // Reset form
      setNewJobTitle('');
      setNewJobDescription('');
      setNewJobResponsibilities('');
      setNewJobRequirements('');
      setActiveTab('manage-jobs');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setActionError('Failed to publish job posting. Please try again.');
    } finally {
      setIsSubmittingJob(false);
    }
  };

  // Toggle Job Active Status
  const handleToggleJobStatus = async (job: JobPosting) => {
    try {
      const updated = await api.updateJob(job.id, { active: !job.active });
      setCompanyJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      setActionSuccess(`Job listing "${job.title}" is now ${updated.active ? 'Active & Receiving Applicants' : 'Paused'}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError('Failed to update job status.');
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId: string, jobTitle: string) => {
    if (!window.confirm(`Are you sure you want to remove the job listing "${jobTitle}"?`)) return;
    try {
      await api.deleteJob(jobId);
      setCompanyJobs(prev => prev.filter(j => j.id !== jobId));
      setActionSuccess(`Removed "${jobTitle}" from job listings.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError('Failed to delete job.');
    }
  };

  // Open Share Modal for a specific job
  const handleOpenShareModal = (job: JobPosting) => {
    setShareModalJob(job);
    setSelectedCandidateIds(job.sharedWithCandidateIds || []);
    setShareCustomNote(job.sharedNotes || `Hi! ${currentCompany?.name || 'Our team'} reviewed your verified profile on Skillix and invites you to apply for ${job.title}.`);
  };

  // Submit Job Share to Selected Candidates
  const handleExecuteJobShare = async () => {
    if (!shareModalJob) return;
    if (selectedCandidateIds.length === 0) {
      setActionError('Please select at least one candidate profile to share this post with.');
      setTimeout(() => setActionError(null), 3500);
      return;
    }

    setSharingInProgress(true);
    setActionError(null);
    try {
      const res = await api.shareJobWithCandidates(shareModalJob.id, selectedCandidateIds, shareCustomNote);
      if (res.success) {
        setCompanyJobs(prev => prev.map(j => j.id === shareModalJob.id ? res.job : j));
        setShareModalJob(null);
        setActionSuccess(`Job post directly broadcasted to ${selectedCandidateIds.length} candidate profile(s)! It is now highlighted in their personal feeds.`);
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err) {
      setActionError('Failed to share job vacancy.');
    } finally {
      setSharingInProgress(false);
    }
  };

  // Search talent in pool
  const handlePerformTalentSearch = async () => {
    setLoading(true);
    try {
      const results = await api.searchEmployerTalent({
        search: talentQuery,
        province: talentProvince !== 'all' ? talentProvince : undefined,
        nqfLevel: talentMinNqf > 0 ? talentMinNqf : undefined,
        isEE: talentEeOnly ? true : undefined,
        jobId: selectedJobForTalentMatch || undefined
      });
      setTalentPool(results);
    } catch (err) {
      console.error('Talent search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'talent-search') return;
    const timer = setTimeout(() => {
      setLoading(true);
      api.searchEmployerTalent({
        search: talentQuery,
        province: talentProvince !== 'all' ? talentProvince : undefined,
        nqfLevel: talentMinNqf > 0 ? talentMinNqf : undefined,
        isEE: talentEeOnly ? true : undefined,
        jobId: selectedJobForTalentMatch || undefined,
      })
        .then(setTalentPool)
        .catch(err => console.error('Talent search failed:', err))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, talentQuery, talentProvince, talentMinNqf, talentEeOnly, selectedJobForTalentMatch]);

  // Update Application ATS Status
  const handleUpdateApplicationStatus = async (appId: string, newStatus: string, candidateName: string) => {
    try {
      await api.updateApplicationStatus(appId, newStatus, `Status updated by ${currentCompany?.name} hiring manager.`);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      setActionSuccess(`Updated ${candidateName}'s application status to "${newStatus}".`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError('Failed to update application status.');
    }
  };

  // Quick share directly from Talent Pool card
  const handleQuickShareToCandidate = async (candidateId: string, candidateName: string) => {
    if (companyJobs.length === 0) {
      setActionError('Please create at least one active job posting before sharing.');
      setTimeout(() => setActionError(null), 3500);
      return;
    }
    const targetJob = companyJobs.find(j => j.id === selectedJobForTalentMatch) || companyJobs[0];
    try {
      const currentShared = targetJob.sharedWithCandidateIds || [];
      const updatedIds = Array.from(new Set([...currentShared, candidateId]));
      const res = await api.shareJobWithCandidates(
        targetJob.id,
        updatedIds,
        `Shared directly by ${currentCompany?.name} recruitment team.`
      );
      if (res.success) {
        setCompanyJobs(prev => prev.map(j => j.id === targetJob.id ? res.job : j));
        setTalentPool(prev => prev.map(item => item.candidate.id === candidateId ? { ...item, isShared: true } : item));
        setActionSuccess(`Shared "${targetJob.title}" directly to ${candidateName}'s profile!`);
        setTimeout(() => setActionSuccess(null), 3500);
      }
    } catch (err) {
      setActionError('Failed to share job with candidate.');
    }
  };

  return (
    <div id="employer-portal-root" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner: Enterprise Identity & Recruiter Switcher */}
      <div id="employer-header-card" className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 overflow-hidden border border-slate-100 shadow-inner">
              {currentCompany?.logo ? (
                <img src={currentCompany.logo} alt={currentCompany.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{currentCompany?.name || 'Company Recruitment Portal'}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Employer
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Award className="w-3.5 h-3.5" /> {currentCompany?.beeLevel || 'Level 1 B-BBEE'}
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl">
                {currentCompany?.about || 'Advertise jobs, track incoming candidate applications, and share verified vacancies with top South African talent.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {currentCompany?.hqCity}, {currentCompany?.province}</span>
                <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-slate-400" /> {currentCompany?.industry}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {currentCompany?.companySize}</span>
                {currentCompany?.contactPerson && (
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {currentCompany.contactPerson.name} ({currentCompany.contactPerson.role})</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              id="employer-post-btn-quick"
              onClick={() => setActiveTab('post-job')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Post New Vacancy
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div id="employer-action-success" className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">Dismiss</button>
          </div>
        )}
        {actionError && (
          <div id="employer-action-error" className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-red-600 hover:text-red-900 text-xs font-bold">Dismiss</button>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div id="employer-nav-tabs" className="flex overflow-x-auto no-scrollbar gap-1 border-b border-slate-200 mb-8 pb-1">
        <button
          id="tab-btn-overview"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Overview & Metrics
        </button>

        <button
          id="tab-btn-post-job"
          onClick={() => setActiveTab('post-job')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'post-job'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Advertise Job Post
        </button>

        <button
          id="tab-btn-manage-jobs"
          onClick={() => setActiveTab('manage-jobs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'manage-jobs'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Manage Postings ({companyJobs.length})
        </button>

        <button
          id="tab-btn-applicants"
          onClick={() => setActiveTab('applicants')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'applicants'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" /> Applicants & ATS ({applications.length})
        </button>

        <button
          id="tab-btn-talent-search"
          onClick={() => setActiveTab('talent-search')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'talent-search'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Search className="w-4 h-4" /> Candidate Discovery & Direct Share
        </button>

        <button
          id="tab-btn-company-profile"
          onClick={() => setActiveTab('company-profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'company-profile'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" /> Company Details
        </button>
      </div>

      {/* TAB 1: OVERVIEW & DASHBOARD METRICS */}
      {activeTab === 'overview' && (
        <div id="employer-overview-view" className="space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div id="stat-active-jobs" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Postings</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">{companyJobs.filter(j => j.active).length}</div>
              <p className="text-xs text-slate-500 mt-1">Live vacancies receiving applications</p>
            </div>

            <div id="stat-total-applicants" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Applicants</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">{applications.length}</div>
              <p className="text-xs text-slate-500 mt-1">
                {applications.filter(a => a.status === 'Shortlisted').length} shortlisted candidates
              </p>
            </div>

            <div id="stat-direct-shares" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Direct Profile Shares</span>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {companyJobs.reduce((acc, j) => acc + (j.sharedWithCandidateIds?.length || 0), 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Broadcasted directly to matching profiles</p>
            </div>

            <div id="stat-total-views" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Post Views</span>
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {companyJobs.reduce((acc, j) => acc + (j.viewsCount || 48), 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Candidate views across South Africa</p>
            </div>
          </div>

          {/* Quick Actions & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Postings Summary */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Active Job Postings</h2>
                  <p className="text-xs text-slate-500">Current vacancies published on the Skillix platform</p>
                </div>
                <button 
                  onClick={() => setActiveTab('manage-jobs')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  View All ({companyJobs.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {companyJobs.length === 0 ? (
                <div className="text-center py-10">
                  <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No active job postings yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Post a new job vacancy to start receiving verified candidate applications.</p>
                  <button
                    onClick={() => setActiveTab('post-job')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    <PlusCircle className="w-4 h-4" /> Create First Vacancy
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {companyJobs.slice(0, 4).map(job => (
                    <div key={job.id} className="p-4 border border-slate-100 rounded-xl hover:border-slate-300 transition-colors bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{job.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              job.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {job.active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {job.city} ({job.workModel})</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-slate-400" /> R{job.salaryMinZAR.toLocaleString()} - R{job.salaryMaxZAR.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Award className="w-3 h-3 text-slate-400" /> NQF {job.nqfLevelRequired}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenShareModal(job)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Share ({job.sharedWithCandidateIds?.length || 0})
                          </button>
                          <button
                            onClick={() => setActiveTab('applicants')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" /> Applicants ({job.applicantCount || 0})
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Sourcing & Direct Share Widget */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Broadcast Vacancies</h2>
                    <p className="text-xs text-slate-500">Target candidates by skills and qualifications</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Skillix allows companies to directly push verified job posts onto candidates’ personal feeds based on their validated NQF level and verified technical assessments.
                </p>

                <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3.5 mb-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> High-Accuracy Matching
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Candidates matching your required stack will receive an invitation badge directly in their &quot;Personalized Opportunities&quot; tab.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => setActiveTab('talent-search')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  <Search className="w-4 h-4" /> Find Matching Candidates
                </button>
                <button
                  onClick={() => setActiveTab('post-job')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  <PlusCircle className="w-4 h-4" /> Create Another Listing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POST A NEW JOB VACANCY */}
      {activeTab === 'post-job' && (
        <div id="employer-post-job-view" className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Advertise a New Vacancy</h2>
              <p className="text-xs text-slate-500 mt-1">Publish to the central South African labor exchange and invite verified candidates directly.</p>
            </div>
            <button
              type="button"
              onClick={handleAIGenerateJobDesc}
              disabled={isGeneratingAI}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isGeneratingAI ? 'Generating with Gemini AI...' : 'AI Auto-Generate Description'}
            </button>
          </div>

          <form onSubmit={handlePublishJob} className="space-y-6">
            {/* Row 1: Title & Sector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Full Stack Engineer"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Industry Sector *</label>
                <select
                  value={newJobSector}
                  onChange={(e) => setNewJobSector(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {JOB_SECTORS.map(sector => <option key={sector} value={sector}>{sector}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Location & Work Model */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City / Region *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sandton, Johannesburg"
                  value={newJobCity}
                  onChange={(e) => setNewJobCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Province *</label>
                <select
                  value={newJobProvince}
                  onChange={(e) => setNewJobProvince(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Model *</label>
                <select
                  value={newJobWorkModel}
                  onChange={(e) => setNewJobWorkModel(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>

            {/* Row 3: Remuneration (ZAR) & Qualifications */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Min Salary (ZAR/mo) *</label>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  value={newJobSalaryMin}
                  onChange={(e) => setNewJobSalaryMin(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Salary (ZAR/mo) *</label>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  value={newJobSalaryMax}
                  onChange={(e) => setNewJobSalaryMax(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Min NQF Level *</label>
                <select
                  value={newJobNqf}
                  onChange={(e) => setNewJobNqf(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value={4}>NQF 4 (Matric)</option>
                  <option value={5}>NQF 5 (Higher Cert)</option>
                  <option value={6}>NQF 6 (National Diploma)</option>
                  <option value={7}>NQF 7 (Bachelor&apos;s Degree)</option>
                  <option value={8}>NQF 8 (Honours / Postgrad)</option>
                  <option value={9}>NQF 9 (Master&apos;s)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Min Experience (Yrs) *</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={newJobExpYears}
                  onChange={(e) => setNewJobExpYears(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Row 4: Required and Preferred Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Required Skills (Comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="TypeScript, React, Node.js, REST APIs"
                  value={newJobRequiredSkills}
                  onChange={(e) => setNewJobRequiredSkills(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred / Bonus Skills (Optional)</label>
                <input
                  type="text"
                  placeholder="AWS, Docker, PostgreSQL, POPIA Compliance"
                  value={newJobPreferredSkills}
                  onChange={(e) => setNewJobPreferredSkills(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Row 5: Job Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Overview & Role Purpose *</label>
              <textarea
                rows={3}
                required
                placeholder="Describe the mission, squad structure, and key goals for this role at your company..."
                value={newJobDescription}
                onChange={(e) => setNewJobDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Row 6: Responsibilities & Requirements Lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Key Responsibilities (One per line)</label>
                <textarea
                  rows={4}
                  placeholder="Architect scalable cloud microservices&#10;Collaborate with product squads&#10;Champion automated testing"
                  value={newJobResponsibilities}
                  onChange={(e) => setNewJobResponsibilities(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Requirements (One per line)</label>
                <textarea
                  rows={4}
                  placeholder="BSc in Computer Science or NQF 7 equivalent&#10;3+ years production TypeScript engineering&#10;Experience with high-concurrency systems"
                  value={newJobRequirements}
                  onChange={(e) => setNewJobRequirements(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-xs"
                />
              </div>
            </div>

            {/* Row 7: South African Compliance Flags */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">B-BBEE Contributor Status</label>
                <select
                  value={newJobBbbeeLevel}
                  onChange={(e) => setNewJobBbbeeLevel(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="Level 1 Contributor">Level 1 Contributor (135% Recognition)</option>
                  <option value="Level 2 Contributor">Level 2 Contributor (125% Recognition)</option>
                  <option value="Level 3 Contributor">Level 3 Contributor (110% Recognition)</option>
                  <option value="Level 4 Contributor">Level 4 Contributor (100% Recognition)</option>
                  <option value="Non-Compliant">Non-Compliant</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newJobSetaAccredited}
                    onChange={(e) => setNewJobSetaAccredited(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-800">SETA Accredited & Skills Development Levy Eligible</span>
                </label>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('manage-jobs')}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingJob}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmittingJob ? 'Publishing...' : 'Publish Job Vacancy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MANAGE JOB POSTINGS */}
      {activeTab === 'manage-jobs' && (
        <div id="employer-manage-jobs-view" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your Published Vacancies</h2>
              <p className="text-xs text-slate-500">Manage active recruitment cycles, track views, and share posts with matching candidates.</p>
            </div>
            <button
              onClick={() => setActiveTab('post-job')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Post New Job
            </button>
          </div>

          {companyJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Job Postings Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">You haven&apos;t posted any job vacancies for this enterprise profile yet.</p>
              <button
                onClick={() => setActiveTab('post-job')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                <PlusCircle className="w-4 h-4" /> Create Vacancy
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Job Title & Sector</th>
                      <th className="py-3.5 px-4">Location & Model</th>
                      <th className="py-3.5 px-4">Remuneration (ZAR)</th>
                      <th className="py-3.5 px-4">NQF Level</th>
                      <th className="py-3.5 px-4 text-center">Applicants</th>
                      <th className="py-3.5 px-4 text-center">Profile Shares</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {companyJobs.map(job => (
                      <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-900">
                          <div>{job.title}</div>
                          <span className="text-[11px] text-slate-500 font-normal">{job.sector}</span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          <div>{job.city}</div>
                          <span className="text-[11px] text-slate-400">{job.workModel}</span>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-medium">
                          R{job.salaryMinZAR.toLocaleString()} - R{job.salaryMaxZAR.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-800">
                            NQF {job.nqfLevelRequired}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setActiveTab('applicants')}
                            className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-blue-600 bg-slate-100 px-2.5 py-1 rounded-full"
                          >
                            <Users className="w-3 h-3" /> {job.applicantCount || 0}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full text-[11px]">
                            <Share2 className="w-3 h-3" /> {job.sharedWithCandidateIds?.length || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleJobStatus(job)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                              job.active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {job.active ? 'Active' : 'Paused'}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenShareModal(job)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition-colors"
                              title="Share vacancy directly with candidates"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Share
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id, job.title)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Delete posting"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: APPLICANTS & ATS PIPELINE */}
      {activeTab === 'applicants' && (
        <div id="employer-applicants-view" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Candidate ATS Pipeline</h2>
              <p className="text-xs text-slate-500">Review candidate submissions, assess verified skills match, and advance hiring stages.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Total Applicants:</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold">{applications.length}</span>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Applications Received Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Broadcast your active job vacancies to candidate profiles to accelerate qualified applicants.
              </p>
              <button
                onClick={() => setActiveTab('talent-search')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
              >
                <Search className="w-4 h-4" /> Discover & Invite Candidates
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(appItem => (
                <div key={appItem.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Candidate Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{appItem.userName}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Match: {appItem.overallMatchScore}%
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          NQF {appItem.userNqfLevel}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-700">
                        Applied for: <span className="text-slate-900 font-bold">{appItem.jobTitle}</span> ({appItem.company})
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {appItem.userEmail}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {appItem.userCity}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Applied: {appItem.appliedAt}</span>
                      </div>

                      {appItem.coverLetterNotes && (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 italic">
                          &quot;{appItem.coverLetterNotes}&quot;
                        </div>
                      )}

                      {/* Verified Skills tags */}
                      {appItem.candidateProfile?.skills && (
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Verified Skill Inventory</span>
                          <div className="flex flex-wrap gap-1.5">
                            {appItem.candidateProfile.skills.slice(0, 6).map((sk: any, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                                <Check className="w-3 h-3 text-emerald-600" /> {sk.name} ({sk.proficiency})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ATS Status Action Dropdown */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shrink-0 lg:w-64 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recruitment Stage</label>
                        <select
                          value={appItem.status}
                          onChange={(e) => handleUpdateApplicationStatus(appItem.id, e.target.value, appItem.userName)}
                          className={`w-full px-3 py-2 text-xs font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                            appItem.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            appItem.status === 'Interview Scheduled' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                            appItem.status === 'Offered' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                            appItem.status === 'Rejected' ? 'bg-red-50 text-red-800 border-red-300' :
                            'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="Under Review">Under Review</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview Scheduled">Interview Scheduled</option>
                          <option value="Offered">Offer Extended</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        {appItem.status === 'Shortlisted' && <span className="text-emerald-700 font-medium">Candidate is marked for interview loop.</span>}
                        {appItem.status === 'Under Review' && <span>Awaiting recruiter screening.</span>}
                        {appItem.status === 'Interview Scheduled' && <span className="text-blue-700 font-medium">Interview invitations dispatched.</span>}
                      </div>

                      <a
                        href={`mailto:${appItem.userEmail}?subject=Skillix Opportunity: ${appItem.jobTitle} at ${appItem.company}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email Candidate
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TALENT DISCOVERY & DIRECT SHARE TO PROFILES */}
      {activeTab === 'talent-search' && (
        <div id="employer-talent-search-view" className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">South African Talent Discovery</h2>
                <p className="text-xs text-slate-500">Search verified candidates, match skills against your vacancies, and share job posts directly to their profiles.</p>
              </div>

              {/* Target Job Selector for Matching */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Match Against Job:</span>
                <select
                  value={selectedJobForTalentMatch}
                  onChange={(e) => setSelectedJobForTalentMatch(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-900 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-900"
                >
                  {companyJobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, headline, skills (e.g. TypeScript, SQL, Cloud)..."
                    value={talentQuery}
                    onChange={(e) => setTalentQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <select
                  value={talentProvince}
                  onChange={(e) => setTalentProvince(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">All Provinces</option>
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

              <div>
                <select
                  value={talentMinNqf}
                  onChange={(e) => setTalentMinNqf(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value={0}>Any NQF Level</option>
                  <option value={6}>NQF 6+ (Diploma)</option>
                  <option value={7}>NQF 7+ (Bachelor&apos;s)</option>
                  <option value={8}>NQF 8+ (Honours/Master&apos;s)</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={talentEeOnly}
                    onChange={e => setTalentEeOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  EE only
                </label>
                <button
                  type="button"
                  onClick={handlePerformTalentSearch}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" /> Filter Talent
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {talentPool.map(({ candidate, matchScore, isShared, hasApplied }) => (
              <div key={candidate.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{candidate.name}</h3>
                        {candidate.isEE && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            EE Candidate
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium line-clamp-1">{candidate.headline}</p>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {matchScore}% Match
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">NQF {candidate.nqfLevel}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 my-2.5 leading-relaxed">
                    {candidate.bio}
                  </p>

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5 my-3">
                    {candidate.skills?.slice(0, 5).map((sk: any, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                        <Check className="w-3 h-3 text-emerald-600" /> {sk.name}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {candidate.city}, {candidate.province}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-slate-400" /> {candidate.totalExperienceYears} yrs exp</span>
                  </div>
                </div>

                {/* Direct Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    {hasApplied && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Applied to Vacancy
                      </span>
                    )}
                    {isShared && !hasApplied && (
                      <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                        <Share2 className="w-3.5 h-3.5" /> Shared on Candidate Feed
                      </span>
                    )}
                    {!isShared && !hasApplied && (
                      <span className="text-slate-400">Not yet contacted</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleQuickShareToCandidate(candidate.id, candidate.name)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isShared 
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" /> {isShared ? 'Share Again' : 'Share Job Post'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: COMPANY PROFILE & VERIFICATION */}
      {activeTab === 'company-profile' && currentCompany && (
        <div id="employer-profile-view" className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Enterprise Profile & Credentials</h2>
              <p className="text-xs text-slate-500">Corporate verification and recruitment contact info</p>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-4 h-4" /> B-BBEE Verified Enterprise
            </span>
          </div>

          <div id="company-profile-fields" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
                  {currentCompany.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recruitment Email</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
                  {currentCompany.email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Industry</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">{currentCompany.industry}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">B-BBEE Status</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">{currentCompany.beeLevel}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Headquarters city</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">{currentCompany.hqCity}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Province</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">{currentCompany.province}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company size</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">{currentCompany.companySize}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Website</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">{currentCompany.website || 'Not provided'}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company phone</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">{currentCompany.phone || 'Not provided'}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">About the Organisation</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">{currentCompany.about}</div>
            </div>

            {currentCompany.contactPerson && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Recruitment Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-700 mb-1">Name</label><div className="text-xs text-slate-600">{currentCompany.contactPerson.name}</div></div>
                  <div><label className="block text-xs font-semibold text-slate-700 mb-1">Role</label><div className="text-xs text-slate-600">{currentCompany.contactPerson.role}</div></div>
                  <div><label className="block text-xs font-semibold text-slate-700 mb-1">Contact email</label><div className="text-xs text-slate-600">{currentCompany.contactPerson.email}</div></div>
                  <div><label className="block text-xs font-semibold text-slate-700 mb-1">Contact phone</label><div className="text-xs text-slate-600">{currentCompany.contactPerson.phone || 'Not provided'}</div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHARE JOB MODAL DIALOG */}
      {shareModalJob && (
        <div id="share-job-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Share Job Post Directly to Profiles</h3>
                  <p className="text-xs text-slate-500">{shareModalJob.title} - {shareModalJob.company}</p>
                </div>
              </div>
              <button 
                onClick={() => setShareModalJob(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invitation Note from Recruiter</label>
                <textarea
                  rows={2}
                  value={shareCustomNote}
                  onChange={(e) => setShareCustomNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">Select Candidates to Receive Post</label>
                  <span className="text-[11px] text-slate-500">{selectedCandidateIds.length} candidate(s) selected</span>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                  {talentPool.map(({ candidate, matchScore }) => {
                    const isSelected = selectedCandidateIds.includes(candidate.id);
                    return (
                      <div 
                        key={candidate.id}
                        onClick={() => {
                          setSelectedCandidateIds(prev => 
                            isSelected ? prev.filter(id => id !== candidate.id) : [...prev, candidate.id]
                          );
                        }}
                        className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{candidate.name}</div>
                            <div className="text-[11px] text-slate-500">{candidate.headline} - {candidate.city}</div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-slate-200 text-slate-700">
                          {matchScore}% Match
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShareModalJob(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sharingInProgress || selectedCandidateIds.length === 0}
                onClick={handleExecuteJobShare}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sharingInProgress ? 'Broadcasting...' : `Broadcast to ${selectedCandidateIds.length} Candidate(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
