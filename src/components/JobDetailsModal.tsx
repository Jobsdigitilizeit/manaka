import React, { useState } from 'react';
import { JobPosting, UserProfile, SkillGapAnalysis } from '../types';
import {
  X,
  MapPin,
  Coins,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  ShieldCheck,
  Building,
  ArrowUpRight,
  Send,
  Check
} from 'lucide-react';

interface JobDetailsModalProps {
  job: JobPosting;
  user: UserProfile;
  analysis?: SkillGapAnalysis;
  onClose: () => void;
  onApply: (job: JobPosting, matchScore: number, coverNotes?: string) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  user,
  analysis,
  onClose,
  onApply,
}) => {
  const [coverNotes, setCoverNotes] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);

  const matchScore = analysis?.overallScore || 85;

  const handleConfirmApply = () => {
    onApply(job, matchScore, coverNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 text-slate-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="pb-4 border-b border-slate-100 pr-10">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {job.sector}
            </span>
            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
              {job.workModel}
            </span>
            {job.bbbeeLevel && (
              <span className="bg-amber-50 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                B-BBEE Level {job.bbbeeLevel}
              </span>
            )}
            {job.setaAccredited && (
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                SETA Accredited Employer
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{job.title}</h2>

          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 mt-2.5">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {job.company}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.city}, {job.province}
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              R{job.salaryMinZAR.toLocaleString()} - R{job.salaryMaxZAR.toLocaleString()} /pm
            </span>
            <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              NQF Level {job.nqfLevelRequired}+
            </span>
          </div>
        </div>

        {/* AI Match Overview Banner if available */}
        {analysis && (
          <div className="my-4 p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                {analysis.overallScore}%
              </div>
              <div>
                <span className="text-xs font-black text-emerald-900">Your AI Suitability Rating: {analysis.suitabilityVerdict}</span>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {analysis.matchedSkills.length} matched skills • {analysis.missingSkills.length} gap skills
                </p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-800 font-bold bg-white border border-emerald-200 px-2.5 py-1 rounded-full hidden sm:flex items-center gap-1 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>OECD Fairness Verified</span>
            </span>
          </div>
        )}

        {/* Job Content Body */}
        <div className="space-y-4 text-xs text-slate-700 my-4">
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
              About the Opportunity
            </h4>
            <p className="leading-relaxed text-slate-600 font-medium">{job.description}</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Key Responsibilities
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
              {job.responsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Role Requirements
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
              {job.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              Required Core Competencies
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredSkills.map(skill => {
                const isMatched = (user.skills || []).some(s => s.name.toLowerCase() === skill.toLowerCase());
                return (
                  <span
                    key={skill}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                      isMatched
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isMatched && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{skill}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Apply Section */}
        {!showApplyForm ? (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Applicant candidate: <strong className="text-slate-900">{user.name}</strong> ({user.email})
            </span>
            <button
              onClick={() => setShowApplyForm(true)}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>Apply with Verified Profile</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in">
            <label className="text-xs font-bold text-slate-900 block">
              Add Note or Motivation to Employer (Optional):
            </label>
            <textarea
              value={coverNotes}
              onChange={(e) => setCoverNotes(e.target.value)}
              placeholder="e.g. I am passionate about this role and my verified competencies in TypeScript and Cloud architecture align with Discovery's technical vision..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            ></textarea>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowApplyForm(false)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Submit Application</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
