import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { SA_LEARNING_PROVIDERS } from '../data/mockData';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  Calendar,
  Award,
  BookOpen,
  ArrowRight,
  Clock,
  Target,
  GraduationCap,
  Briefcase
} from 'lucide-react';

interface CareerRoadmapViewProps {
  user: UserProfile;
}

export const CareerRoadmapView: React.FC<CareerRoadmapViewProps> = ({ user }) => {
  const [targetRole, setTargetRole] = useState('Senior Full Stack Cloud Engineer');
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const generateRoadmap = async (role: string) => {
    setLoading(true);
    try {
      const data = await api.generateCareerRoadmap(user, role);
      setRoadmapData(data);
    } catch (err) {
      console.error('Failed to generate career roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateRoadmap(targetRole);
  }, [user.id]);

  const toggleStep = (id: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              South African Career & Upskilling Roadmap
            </h1>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              NQF / SETA Aligned
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Personalized, step-by-step career path to transition into high-demand South African industries.
          </p>
        </div>

        {/* Target Role Selector */}
        <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
          <span className="text-xs text-slate-500 pl-2 font-bold uppercase tracking-wider text-[11px]">Target Role:</span>
          <select
            value={targetRole}
            onChange={(e) => {
              setTargetRole(e.target.value);
              generateRoadmap(e.target.value);
            }}
            className="bg-slate-50 text-xs text-slate-800 font-bold rounded-xl px-3 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="Senior Full Stack Cloud Engineer">Senior Full Stack Cloud Engineer</option>
            <option value="AI & Data Scientist (FinTech)">AI & Data Scientist (FinTech)</option>
            <option value="Cloud Solutions Architect (AWS/Azure)">Cloud Solutions Architect (AWS/Azure)</option>
            <option value="Cybersecurity & POPIA Specialist">Cybersecurity & POPIA Specialist</option>
            <option value="Renewable Solar Energy Project Engineer">Renewable Solar Energy Project Engineer</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Actionable Milestones */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-bold text-slate-800">Formulating Career Upskilling Plan...</p>
              <p className="text-xs text-slate-500 font-medium">Mapping accredited South African curricula and duration estimates.</p>
            </div>
          ) : roadmapData ? (
            <div className="space-y-5">
              {/* Summary Metric Header Bento Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Pathway Objective
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">{roadmapData.targetRole}</h3>
                  <p className="text-xs text-slate-300 mt-1">Based on candidate's current NQF Level {user.nqfLevel} and {user.skills.length} verified competencies.</p>
                </div>

                <div className="flex items-center space-x-5">
                  <div className="text-center">
                    <div className="text-3xl font-black text-emerald-400">{roadmapData.currentReadinessScore || 78}%</div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Current Readiness</div>
                  </div>
                  <div className="text-center pl-5 border-l border-slate-700">
                    <div className="text-3xl font-black text-blue-400">~{roadmapData.estimatedTimeToTargetMonths || 4} Mo</div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Target Timeline</div>
                  </div>
                </div>
              </div>

              {/* Phased Roadmap Timeline Cards */}
              <div className="space-y-4">
                {roadmapData.milestones?.map((milestone: any, index: number) => {
                  const stepId = `step-${index}`;
                  const isDone = completedSteps[stepId];
                  return (
                    <div
                      key={index}
                      className={`bg-white border rounded-3xl p-6 shadow-xs transition-all ${
                        isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3.5">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 mt-0.5 ${
                            isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
                              {milestone.phase}
                            </span>
                            <h4 className="text-base font-black text-slate-900 mt-0.5">
                              {milestone.recommendedAction}
                            </h4>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleStep(stepId)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                        </button>
                      </div>

                      {/* Focus Skills */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider text-[11px]">Core Focus:</span>
                        {milestone.focusSkills?.map((skill: string) => (
                          <span key={skill} className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Timeline & SA Accreditation info */}
                      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium gap-2 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Estimated: {milestone.estimatedWeeklyHours} hrs/week
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          {milestone.saAccreditation}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right 4 Cols: Recommended South African Training Providers */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recognized SA Institutions</h3>
                <p className="text-[11px] text-slate-500">SETA & SAQA Accredited Providers</p>
              </div>
            </div>

            <div className="space-y-3">
              {SA_LEARNING_PROVIDERS.map((inst, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 hover:border-emerald-200 transition-all">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-extrabold text-slate-900">{inst.name}</h4>
                  </div>
                  <span className="inline-block text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                    {inst.type}
                  </span>
                  <p className="text-[11px] text-slate-600 font-medium">Focus: {inst.focus}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                    <span>{inst.recognizedBy}</span>
                    <span className="text-emerald-700 font-bold">{inst.typicalDuration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
