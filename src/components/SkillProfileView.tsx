import React, { useState } from 'react';
import { UserProfile, UserSkill, SkillCategory, SkillProficiency } from '../types';
import { api } from '../services/api';
import { generateCandidateProfilePDF } from '../utils/pdfGenerator';
import {
  FileText,
  Sparkles,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Award,
  Save,
  Download,
  AlertCircle,
  Briefcase,
  GraduationCap,
  MapPin,
  Coins,
  Check,
  TrendingUp,
  Zap
} from 'lucide-react';

interface SkillProfileViewProps {
  user: UserProfile;
  onUserUpdate: (updated: UserProfile) => void;
  onOpenQuiz: (skill: UserSkill) => void;
  onNavigateToMatches: () => void;
}

export const SkillProfileView: React.FC<SkillProfileViewProps> = ({
  user,
  onUserUpdate,
  onOpenQuiz,
  onNavigateToMatches,
}) => {
  const [profile, setProfile] = useState<UserProfile>(user);
  const [cvInputText, setCvInputText] = useState('');
  const [isParsingCV, setIsParsingCV] = useState(false);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Skill form state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('technical');
  const [newSkillProficiency, setNewSkillProficiency] = useState<SkillProficiency>('Intermediate');

  // Filter category in skills list
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Sync state if user prop changes
  React.useEffect(() => {
    setProfile(user);
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      const saved = await api.saveUser(profile);
      onUserUpdate(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleParseCV = async (textToParse?: string) => {
    const text = textToParse || cvInputText;
    if (!text.trim()) return;

    setIsParsingCV(true);
    setParseSuccessMessage(null);

    try {
      const parsed = await api.parseCVWithAI(text, 'User_CV.txt');
      if (parsed) {
        // Merge or replace skills
        const updatedSkills: UserSkill[] = [...(parsed.skills || [])];

        const updatedProfile: UserProfile = {
          ...profile,
          headline: parsed.headline || profile.headline,
          nqfLevel: parsed.nqfLevelEstimate || profile.nqfLevel,
          totalExperienceYears: parsed.totalExperienceYears || profile.totalExperienceYears,
          skills: updatedSkills,
          bio: parsed.experienceSummary || profile.bio,
          resumeRawText: text,
        };

        setProfile(updatedProfile);
        onUserUpdate(updatedProfile);
        await api.saveUser(updatedProfile);
        setParseSuccessMessage(`AI successfully extracted ${updatedSkills.length} skills and estimated NQF Level ${parsed.nqfLevelEstimate || 7}!`);
      }
    } catch (err: any) {
      console.error('CV Parsing failed:', err);
      setParseSuccessMessage('Failed to analyze CV. Please verify input text.');
    } finally {
      setIsParsingCV(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const exists = profile.skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase());
    if (exists) {
      alert('This skill already exists in your profile.');
      return;
    }

    const updated: UserSkill = {
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: newSkillProficiency,
      verifiedByQuiz: false,
      confidenceScore: 85,
      yearsOfExperience: 1,
    };

    const updatedProfile = {
      ...profile,
      skills: [...profile.skills, updated],
    };

    setProfile(updatedProfile);
    onUserUpdate(updatedProfile);
    setNewSkillName('');
  };

  const handleRemoveSkill = (skillName: string) => {
    const updatedProfile = {
      ...profile,
      skills: profile.skills.filter(s => s.name !== skillName),
    };
    setProfile(updatedProfile);
    onUserUpdate(updatedProfile);
  };

  const handleUpdateProficiency = (skillName: string, proficiency: SkillProficiency) => {
    const updatedProfile = {
      ...profile,
      skills: profile.skills.map(s => s.name === skillName ? { ...s, proficiency } : s),
    };
    setProfile(updatedProfile);
    onUserUpdate(updatedProfile);
  };

  const filteredSkills = profile.skills.filter(s => {
    if (selectedCategoryFilter === 'all') return true;
    return s.category === selectedCategoryFilter;
  });

  const verifiedCount = profile.skills.filter(s => s.verifiedByQuiz).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Candidate Skills & Profile Hub
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
              NQF Level {profile.nqfLevel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Upload your CV or manage technical and soft competencies for AI labour market matching.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveProfile}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs"
          >
            {saveSuccess ? <Check className="w-4 h-4 text-emerald-100" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Saved to Database!' : 'Save Profile'}</span>
          </button>

          <button
            onClick={() => generateCandidateProfilePDF(profile, [])}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm transition-all shadow-xs"
            title="Download Candidate Dossier PDF"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Account Status Notice if Revoked */}
      {profile.status === 'revoked' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl flex items-center justify-between text-rose-900 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center font-black">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">Account Access Suspended / Revoked</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                This candidate account has been revoked by administration. {profile.statusReason ? `Reason: "${profile.statusReason}"` : 'Please contact admin@skillix.gov.za for assistance.'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-rose-200 px-2 py-1 rounded-lg">RESTRICTED</span>
        </div>
      )}

      {/* Top Bento Highlight Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento 1: Profile Strength */}
        <div className="md:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Profile Strength
            </h3>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-4xl font-black text-emerald-600">
                {Math.min(95, Math.round(50 + profile.skills.length * 3 + verifiedCount * 5))}%
              </span>
              <span className="text-xs font-bold text-slate-500">
                {profile.skills.length} Competencies
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full mb-3 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(95, Math.round(50 + profile.skills.length * 3 + verifiedCount * 5))}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your NQF Level {profile.nqfLevel} profile in {profile.city}, {profile.province} places you in the top candidate tier for {profile.headline || 'Tech roles'}.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 uppercase tracking-wider">
              {verifiedCount} Verified Skills
            </span>
            <span className="text-xs text-slate-400 font-medium">NQF {profile.nqfLevel}</span>
          </div>
        </div>

        {/* Bento 2: Profile summary */}
        <div className="md:col-span-8 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200">
                Career Path Projection
              </span>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                Your profile
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black mb-2 tracking-tight">
              {profile.headline || 'Add a professional headline to your profile'}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed mb-4">
              {profile.skills.length > 0
                ? `You have ${profile.skills.length} skill${profile.skills.length === 1 ? '' : 's'} listed, ${profile.skills.filter(k => k.verifiedByQuiz).length} verified. Verify more skills with a short quiz so employers can trust them, then check your AI job matches.`
                : 'Add your skills or paste your CV below. Your profile is used to match you to vacancies and show what to learn next.'}
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap gap-2.5">
            {profile.expectedSalaryZAR > 0 && (
              <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span>Target R{profile.expectedSalaryZAR.toLocaleString('en-ZA')}/pm</span>
              </div>
            )}
            <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span>{profile.totalExperienceYears || 0} yrs experience</span>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>{profile.city}, {profile.province}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left (AI CV Analyzer & Profile Details) & Right (Skills Inventory) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: AI CV Deep Extractor Bento Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AI CV & Resume Deep Parser</h3>
                <p className="text-[11px] text-slate-500">Powered by Gemini 3.7 Flash</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Paste your resume text to automatically extract your skills, estimate your NQF level, and structure competencies.
            </p>

            {/* CV Text Area */}
            <div className="relative mb-3">
              <textarea
                value={cvInputText}
                onChange={(e) => setCvInputText(e.target.value)}
                placeholder="Paste your CV / Resume text here (Experience, Education, Skills, Technologies)..."
                rows={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono resize-none leading-relaxed"
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                disabled={isParsingCV || !cvInputText.trim()}
                onClick={() => handleParseCV()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                {isParsingCV ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Extracting Skills with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Skills Extraction</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setCvInputText('')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                title="Clear input"
              >
                Clear
              </button>
            </div>

            {parseSuccessMessage && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{parseSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Card: South African Labour Context Profile Details Bento Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>South African Job Seeker Details</span>
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                value={profile.headline}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  SA Location (City)
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="e.g. Johannesburg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Province
                </label>
                <select
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Gauteng">Gauteng</option>
                  <option value="Western Cape">Western Cape</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="North West">North West</option>
                  <option value="Northern Cape">Northern Cape</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  NQF Qualification Level
                </label>
                <select
                  value={profile.nqfLevel}
                  onChange={(e) => setProfile({ ...profile, nqfLevel: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value={4}>NQF 4 (Matric / Grade 12)</option>
                  <option value={5}>NQF 5 (Higher Certificate)</option>
                  <option value={6}>NQF 6 (Diploma / Advanced Cert)</option>
                  <option value={7}>NQF 7 (Bachelor's / Adv Dip)</option>
                  <option value={8}>NQF 8 (Honours / Postgrad Dip)</option>
                  <option value={9}>NQF 9 (Master's Degree)</option>
                  <option value={10}>NQF 10 (Doctorate / PhD)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.totalExperienceYears}
                  onChange={(e) => setProfile({ ...profile, totalExperienceYears: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Expected Salary (ZAR/pm)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-bold">R</span>
                  <input
                    type="number"
                    value={profile.expectedSalaryZAR}
                    onChange={(e) => setProfile({ ...profile, expectedSalaryZAR: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Employment Equity
                </label>
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, isEE: !profile.isEE })}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    profile.isEE
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {profile.isEE ? 'EE Affirmative Action' : 'Non-EE Candidate'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Skills Inventory (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Skills Inventory Bento Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">Skills & Competencies</h3>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {profile.skills.length} Total
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {verifiedCount} verified with benchmark badge
                </p>
              </div>

              {/* Match CTA */}
              <button
                onClick={onNavigateToMatches}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>View Job Recommendations →</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 my-4">
              {['all', 'technical', 'soft', 'domain', 'tool'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedCategoryFilter === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Competencies' : cat}
                </button>
              ))}
            </div>

            {/* Skills List */}
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {filteredSkills.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No skills in this category. Add a new skill below or run AI CV extraction.
                </div>
              ) : (
                filteredSkills.map((skill) => (
                  <div
                    key={skill.name}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 hover:border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        skill.category === 'technical' ? 'bg-blue-100 text-blue-800'
                        : skill.category === 'soft' ? 'bg-emerald-100 text-emerald-800'
                        : skill.category === 'domain' ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                      }`}>
                        {skill.category.slice(0, 3).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{skill.name}</span>
                          {skill.verifiedByQuiz ? (
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Unverified</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {skill.yearsOfExperience ? `${skill.yearsOfExperience} yrs exp • ` : ''}
                          Confidence: {skill.confidenceScore || 85}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      {/* Proficiency Selector */}
                      <select
                        value={skill.proficiency}
                        onChange={(e) => handleUpdateProficiency(skill.name, e.target.value as SkillProficiency)}
                        className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl px-2.5 py-1 focus:outline-none shadow-2xs cursor-pointer"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>

                      {/* Quiz Button */}
                      {!skill.verifiedByQuiz && (
                        <button
                          onClick={() => onOpenQuiz(skill)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title="Take skill verification quiz"
                        >
                          <Award className="w-3 h-3 text-emerald-600" />
                          <span>Verify</span>
                        </button>
                      )}

                      {/* Delete Skill */}
                      <button
                        onClick={() => handleRemoveSkill(skill.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete skill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Skill Form */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                + Add Custom Skill / Tool
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. Docker, Python, Risk Management..."
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="technical">Technical</option>
                  <option value="soft">Soft Skill</option>
                  <option value="domain">Domain</option>
                  <option value="tool">Tool / Software</option>
                </select>

                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value as SkillProficiency)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
