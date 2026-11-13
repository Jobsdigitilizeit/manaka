import React, { useState, useEffect } from 'react';
import { JobApplication, UserProfile } from '../types';
import { api } from '../services/api';
import {
  CheckCircle2,
  Clock,
  Building,
  MapPin,
  Calendar,
  AlertCircle,
  FileCheck,
  Send,
  UserCheck,
  ArrowRight
} from 'lucide-react';

interface ApplicationsViewProps {
  user: UserProfile;
  onNavigateToJobs: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  user,
  onNavigateToJobs,
}) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const apps = await api.getApplications({ userId: user.id });
      setApplications(apps);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user.id]);

  const getStatusBadge = (status: JobApplication['status']) => {
    switch (status) {
      case 'Shortlisted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Interview Scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Assessment Sent':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Offered':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Job Applications & Status Tracker
            </h1>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {applications.length} Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time status updates from South African employers and AI shortlist telemetry.
          </p>
        </div>

        <button
          onClick={onNavigateToJobs}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>Explore More Opportunities</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Applications List */}
      <div>
        {loading ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500 font-medium">Loading your applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No applications submitted yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Explore your personalized AI job recommendations and apply with your verified skills dossier.
            </p>
            <button
              onClick={onNavigateToJobs}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider"
            >
              Browse AI Recommendations
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-200 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                    {app.company.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(app.status)}`}>
                        ● {app.status}
                      </span>
                      <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {app.overallMatchScore}% Match Score
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900">{app.jobTitle}</h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1 font-medium">
                      <span className="text-slate-700 font-bold">{app.company}</span>
                      <span>Applied: {app.appliedAt}</span>
                    </div>

                    {app.coverLetterNotes && (
                      <p className="text-xs text-slate-600 mt-2.5 italic bg-slate-50 p-3 rounded-2xl border border-slate-200/80 font-normal">
                        "{app.coverLetterNotes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right self-end sm:self-center shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Application ID</span>
                  <span className="text-xs font-mono text-slate-600 font-bold">{app.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
