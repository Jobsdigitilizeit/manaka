import React, { useState, useEffect } from 'react';
import { JOB_SECTORS, UserProfile, JobMatchResult, JobPosting } from '../types';
import { api } from '../services/api';
import { generateCandidateProfilePDF } from '../utils/pdfGenerator';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Briefcase,
  MapPin,
  Coins,
  ChevronDown,
  ChevronUp,
  Download,
  BookOpen,
  Filter,
  Layers,
  Info,
  Check,
  X
} from 'lucide-react';

interface JobMatchesViewProps {
  user: UserProfile;
  onApplyJob: (job: JobPosting, matchScore: number) => void;
  onViewJobDetails: (job: JobPosting, analysis?: any) => void;
  onNavigateToRoadmap: () => void;
}

export const JobMatchesView: React.FC<JobMatchesViewProps> = ({
  user,
  onApplyJob,
  onViewJobDetails,
  onNavigateToRoadmap,
}) => {
  const [matches, setMatches] = useState<JobMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [minMatchFilter, setMinMatchFilter] = useState<number>(0);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const matchResults = await api.matchSkillsAndJobs(user);
      setMatches(matchResults);
      if (matchResults.length > 0) {
        setExpandedJobId(matchResults[0].job.id);
      }
    } catch (err) {
      console.error('Failed to compute job matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [user.id, user.skills, user.nqfLevel]);

  const filteredMatches = matches.filter(m => {
    if (sectorFilter !== 'all' && m.job.sector.trim().toLowerCase() !== sectorFilter.trim().toLowerCase()) return false;
    if (m.analysis.overallScore < minMatchFilter) return false;
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 border-emerald-200 bg-emerald-50';
    if (score >= 65) return 'text-blue-700 border-blue-200 bg-blue-50';
    if (score >= 50) return 'text-amber-800 border-amber-200 bg-amber-50';
    return 'text-rose-700 border-rose-200 bg-rose-50';
  };

  const getScoreProgressBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 65) return 'bg-blue-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              AI Job Matching & Skill Gap Diagnostics
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              OECD / NIST Aligned
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Personalized South African vacancy recommendations ranked by multi-criteria skills suitability and transparent gap analysis.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => generateCandidateProfilePDF(user, matches)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Match Dossier PDF</span>
          </button>

          <button
            onClick={fetchMatches}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Re-compute AI Matches</span>
          </button>
        </div>
      </div>

      {/* Candidate Overview Summary Bento Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-base shadow-xs">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">{user.name}</span>
              <span className="text-xs text-slate-500 font-medium">({user.city}, {user.province})</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {user.skills.length} Competencies ({user.skills.filter(s => s.verifiedByQuiz).length} Verified) • NQF Level {user.nqfLevel} • {user.totalExperienceYears} Yrs Exp
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Sector:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Sectors</option>
              {JOB_SECTORS.map(sector => <option key={sector} value={sector}>{sector}</option>)}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Min Match:</span>
            <select
              value={minMatchFilter}
              onChange={(e) => setMinMatchFilter(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
            >
              <option value={0}>All Scores</option>
              <option value={60}>60% +</option>
              <option value={75}>75% + (Strong Fit)</option>
              <option value={85}>85% + (Top Fit)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matching Results List */}
      {loading ? (
        <div className="text-center py-16 space-y-3 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-800">Computing AI Skill Vectors & Labor Market Compatibility...</p>
          <p className="text-xs text-slate-500 font-medium">Evaluating NQF qualification levels, experience thresholds, and skill taxonomy.</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No vacancies match the selected criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Try adjusting your sector filter or lowering the minimum match percentage.
          </p>
          <button
            onClick={() => { setSectorFilter('all'); setMinMatchFilter(0); }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredMatches.map(({ job, analysis }, index) => {
            const isExpanded = expandedJobId === job.id;
            return (
              <div
                key={job.id}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-6 shadow-xs transition-all"
              >
                {/* Top Row: Role Title, Company, Match Gauge & Quick Actions */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-sm shrink-0">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                          Rank #{index + 1} Recommendation
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                          {job.sector}
                        </span>
                        <span className="bg-blue-50 text-blue-700 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
                          {job.workModel}
                        </span>
                        {job.sharedWithCandidateIds && job.sharedWithCandidateIds.includes(user.id) && (
                          <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            Direct Invitation From Recruiter
                          </span>
                        )}
                        {job.bbbeeLevel && (
                          <span className="bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                            B-BBEE {job.bbbeeLevel}
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-lg sm:text-xl font-black text-slate-900 mt-1 hover:text-emerald-700 cursor-pointer transition-colors"
                        onClick={() => onViewJobDetails(job, analysis)}
                      >
                        {job.title}
                      </h3>

                      <div className="flex flex-wrap items-center text-xs text-slate-500 font-medium gap-y-1 gap-x-4 mt-1.5">
                        <span className="font-bold text-slate-800">{job.company}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {job.city}, {job.province}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          R{job.salaryMinZAR.toLocaleString()} - R{job.salaryMaxZAR.toLocaleString()} /pm
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          NQF {job.nqfLevelRequired}+
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score Badge & Primary Action */}
                  <div className="flex items-center space-x-3 self-end md:self-start">
                    <div className={`px-3.5 py-2 rounded-2xl border font-black text-center shadow-2xs ${getScoreColor(analysis.overallScore)}`}>
                      <div className="text-2xl leading-none">{analysis.overallScore}%</div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5">
                        {analysis.suitabilityVerdict}
                      </div>
                    </div>

                    <button
                      onClick={() => onApplyJob(job, analysis.overallScore)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                    >
                      <span>Apply Now</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Score Diagnostic Pillars */}
                <div className="grid grid-cols-3 gap-3 my-5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-bold mb-1.5">
                      <span>Core Skills (50%)</span>
                      <span className="font-black text-slate-800">{analysis.skillsScore}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${getScoreProgressBg(analysis.skillsScore)}`} style={{ width: `${analysis.skillsScore}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-bold mb-1.5">
                      <span>Experience (30%)</span>
                      <span className="font-black text-slate-800">{analysis.experienceScore}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${getScoreProgressBg(analysis.experienceScore)}`} style={{ width: `${analysis.experienceScore}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-bold mb-1.5">
                      <span>NQF Level (20%)</span>
                      <span className="font-black text-slate-800">{analysis.qualificationScore}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${getScoreProgressBg(analysis.qualificationScore)}`} style={{ width: `${analysis.qualificationScore}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Skill Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Matched Skills */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Matched Skills ({analysis.matchedSkills.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.matchedSkills.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No direct matches found</span>
                      ) : (
                        analysis.matchedSkills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{s}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Missing Critical Skills (Gaps) */}
                  <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Skill Gaps ({analysis.missingSkills.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.missingSkills.length === 0 ? (
                        <span className="text-xs text-emerald-700 font-bold">No critical gaps! Full skill coverage.</span>
                      ) : (
                        analysis.missingSkills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                            <X className="w-3 h-3 text-rose-600" />
                            <span>{s}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Transferable Skills */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Transferable Competencies</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.transferableSkills.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No secondary skills</span>
                      ) : (
                        analysis.transferableSkills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold">
                            • {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle Explainable AI & Upskilling Drawer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-bold transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isExpanded ? 'Hide Explainability & Upskilling Advice' : 'View AI Match Explanation & Upskilling Solutions'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => onViewJobDetails(job, analysis)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold"
                  >
                    View Full Job Description →
                  </button>
                </div>

                {/* Expanded Details: AI Explainability + Upskilling Pathways */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in">
                    {/* Explainability Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Why this vacancy was recommended:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {analysis.whyRecommended}
                      </p>
                      <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span><strong>Algorithmic Fairness:</strong> {analysis.transparencyExplanation}</span>
                      </div>
                    </div>

                    {/* Upskilling Recommendations */}
                    {analysis.suggestedUpskilling.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-bold text-slate-900">Recommended Upskilling to Close Skill Gaps</span>
                          </div>
                          <button
                            onClick={onNavigateToRoadmap}
                            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline"
                          >
                            Explore Full Career Roadmap →
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {analysis.suggestedUpskilling.map((course, idx) => (
                            <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-900">{course.skill}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                                  ~{course.estimatedWeeks} wks
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] font-medium">{course.courseTitle}</p>
                              <div className="flex justify-between items-center pt-1 text-[10px] text-emerald-700 font-bold">
                                <span>Provider: {course.provider}</span>
                                <span className="text-slate-500 font-medium">{course.costEstimateZAR}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
