import React, { useState, useEffect, useMemo } from 'react';
import { JOB_SECTORS, JobPosting, UserProfile } from '../types';
import { api } from '../services/api';
import {
  Briefcase,
  Search,
  MapPin,
  Coins,
  Filter,
  ArrowUpRight,
  Building,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';

interface JobDirectoryViewProps {
  user: UserProfile;
  onApplyJob: (job: JobPosting, matchScore: number) => void;
  onViewJobDetails: (job: JobPosting) => void;
}

export const JobDirectoryView: React.FC<JobDirectoryViewProps> = ({
  user,
  onApplyJob,
  onViewJobDetails,
}) => {
  const [allJobs, setAllJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedWorkModel, setSelectedWorkModel] = useState('all');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      setAllJobs(await api.getJobs());
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  const jobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sector = selectedSector.toLowerCase();
    const location = selectedLocation.toLowerCase();
    const workModel = selectedWorkModel.toLowerCase();

    return allJobs.filter(job =>
      (selectedSector === 'all' || job.sector?.trim().toLowerCase() === sector) &&
      (selectedLocation === 'all' || `${job.province || ''} ${job.city || ''}`.toLowerCase().includes(location)) &&
      (selectedWorkModel === 'all' || job.workModel?.trim().toLowerCase() === workModel) &&
      (!query || [job.title, job.company, job.description, ...(job.requiredSkills || [])]
        .some(value => (value || '').toLowerCase().includes(query)))
    );
  }, [allJobs, selectedSector, selectedLocation, selectedWorkModel, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            South African Labour Market Vacancies
          </h1>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase">
            {jobs.length} Verified Roles
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Browse active job opportunities across Gauteng, Western Cape, KwaZulu-Natal, and remote South Africa.
        </p>
      </div>

      {/* Search & Multi-Filter Bento Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by job title, company, skill (e.g. React, Python, Solar PV, AWS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Sector / Industry
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl p-2.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Sectors</option>
              {JOB_SECTORS.map(sector => <option key={sector} value={sector}>{sector}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              South African Province / City
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl p-2.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Locations</option>
              <option value="Gauteng">Gauteng (Johannesburg / Pretoria)</option>
              <option value="Western Cape">Western Cape (Cape Town / Stellenbosch)</option>
              <option value="KwaZulu-Natal">KwaZulu-Natal (Durban / Umhlanga)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Work Model
            </label>
            <select
              value={selectedWorkModel}
              onChange={(e) => setSelectedWorkModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl p-2.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Models (Remote, Hybrid, On-site)</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vacancy Card Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500 font-medium">Loading vacancies...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
          {allJobs.length === 0 ? (
            <>
              <p className="text-sm font-bold text-slate-900">No vacancies have been posted yet.</p>
              <p className="mt-2 text-xs text-slate-500">New opportunities will appear here once employers publish job listings.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-900">No jobs match your selected filters.</p>
              <button
                onClick={() => { setSelectedSector('all'); setSelectedLocation('all'); setSelectedWorkModel('all'); setSearchQuery(''); }}
                className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((job) => {
            // Quick match score calculation against active candidate
            const userSkillNames = (user.skills || []).map(s => s.name.toLowerCase());
            const matchedCount = job.requiredSkills.filter(req =>
              userSkillNames.some(u => u.includes(req.toLowerCase()) || req.toLowerCase().includes(u))
            ).length;
            const approxScore = Math.round((matchedCount / Math.max(job.requiredSkills.length, 1)) * 100);

            return (
              <div
                key={job.id}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="bg-slate-100 text-slate-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                          {job.sector}
                        </span>
                        <span className="bg-blue-50 text-blue-700 text-[10px] px-2.5 py-0.5 rounded-full border border-blue-200 font-bold">
                          {job.workModel}
                        </span>
                        {job.bbbeeLevel && (
                          <span className="bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                            B-BBEE {job.bbbeeLevel}
                          </span>
                        )}
                      </div>
                      <h3
                        onClick={() => onViewJobDetails(job)}
                        className="text-base font-black text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors"
                      >
                        {job.title}
                      </h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{job.company}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                        ~{approxScore}% Match
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-medium my-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.city}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      R{job.salaryMinZAR.toLocaleString()} - R{job.salaryMaxZAR.toLocaleString()}
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">NQF {job.nqfLevelRequired}+</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4 font-normal">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {job.requiredSkills.slice(0, 4).map(skill => (
                      <span key={skill} className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold">
                        {skill}
                      </span>
                    ))}
                    {job.requiredSkills.length > 4 && (
                      <span className="text-[11px] text-slate-400 font-bold px-1 py-0.5">
                        +{job.requiredSkills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onViewJobDetails(job)}
                    className="text-xs text-slate-500 hover:text-slate-900 font-bold transition-colors"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => onApplyJob(job, approxScore)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs"
                  >
                    <span>Apply</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
