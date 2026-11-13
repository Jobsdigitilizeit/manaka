export type SkillCategory = 'technical' | 'soft' | 'domain' | 'tool';
export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type WorkModel = 'Remote' | 'Hybrid' | 'On-site';
export type EmploymentType = 'Full-time' | 'Contract' | 'Learnership' | 'Graduate Internship' | 'Part-time';
export type ApplicationStatus = 'Under Review' | 'Shortlisted' | 'Interview Scheduled' | 'Assessment Sent' | 'Offered' | 'Rejected';
export const JOB_SECTORS = [
  'FinTech & Banking',
  'Software & Tech',
  'Mining & Resources',
  'Renewable Energy',
  'Healthcare & Biotech',
  'Retail & E-commerce',
  'Telecommunications',
  'Consulting & BPO',
  'Logistics & Supply Chain',
] as const;
export type JobSector = (typeof JOB_SECTORS)[number];

export interface UserSkill {
  name: string;
  category: SkillCategory;
  proficiency: SkillProficiency;
  verifiedByQuiz?: boolean;
  yearsOfExperience?: number;
  confidenceScore?: number; // 0-100 from AI
}

export interface UserEducation {
  institution: string; // e.g., University of Cape Town, Wits, TVET College
  degree: string; // e.g., BSc Computer Science
  nqfLevel: number; // NQF 4 (Matric) up to NQF 10 (Doctorate)
  yearCompleted: number;
}

export interface UserExperience {
  company: string;
  role: string;
  durationYears: number;
  description: string;
  skillsUsed: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string; // e.g., Johannesburg, Cape Town, Durban, Pretoria, Gqeberha
  province: string; // Gauteng, Western Cape, KwaZulu-Natal, etc.
  headline: string;
  bio: string;
  nqfLevel: number;
  education: UserEducation[];
  experience: UserExperience[];
  totalExperienceYears: number;
  skills: UserSkill[];
  interests: string[];
  preferredWorkModel: WorkModel[];
  preferredSectors: string[];
  expectedSalaryZAR: number;
  isEE: boolean; // Employment Equity candidate in SA context
  resumeRawText?: string;
  avatarUrl?: string;
  verifiedBadgesCount?: number;
  createdAt: string;
  lastActive: string;
  status?: 'active' | 'revoked' | 'suspended';
  statusReason?: string;
  /** Input-only: plaintext is accepted on register/create but never returned by the API. */
  password?: string;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  email: string;
  contactEmail?: string;
  password?: string;
  phone?: string;
  logo?: string;
  industry: string;
  sector?: string;
  hqCity: string;
  city?: string;
  province: string;
  website: string;
  beeLevel: string; // e.g. 'Level 1 B-BBEE', 'Level 2 B-BBEE'
  bbbeeLevel?: string;
  companySize: string; // e.g. '1,000+ Employees', '250-500 Employees'
  about: string;
  description?: string;
  verifiedEmployer: boolean;
  isVerified?: boolean;
  activeJobsCount?: number;
  totalApplicantsReceived?: number;
  directSharesCount?: number;
  contactPerson?: {
    name: string;
    role: string;
    email: string;
    phone?: string;
  };
  status?: 'active' | 'suspended';
  statusReason?: string;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface JobPosting {
  id: string;
  companyId?: string;
  title: string;
  company: string;
  companyLogo?: string;
  sector: JobSector;
  city: string;
  province: string;
  workModel: WorkModel;
  employmentType: EmploymentType;
  salaryMinZAR: number;
  salaryMaxZAR: number;
  salaryPeriod: 'monthly' | 'annual';
  nqfLevelRequired: number;
  minExperienceYears: number;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  bbbeeLevel?: string;
  setaAccredited?: boolean;
  postedDate: string;
  deadline?: string;
  applicantCount: number;
  active: boolean;
  sharedWithCandidateIds?: string[];
  sharedNotes?: string;
  sharedAt?: string;
  viewsCount?: number;
}

export interface SkillGapAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  matchPercentage: number;
  skillsScore: number;
  experienceScore: number;
  qualificationScore: number;
  overallScore: number;
  suitabilityVerdict: 'Highly Suitable' | 'Good Potential' | 'Skill Development Required' | 'Not Recommended';
  whyRecommended: string;
  transparencyExplanation: string;
  biasMitigationNote: string;
  suggestedUpskilling: Array<{
    skill: string;
    courseTitle: string;
    provider: string; // e.g. UCT Online, ALX Africa, WeThinkCode_, ExploreAI Academy, Coursera, TVET/SETA
    estimatedWeeks: number;
    costEstimateZAR: string;
    link?: string;
  }>;
}

export interface JobMatchResult {
  job: JobPosting;
  analysis: SkillGapAnalysis;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  userId: string;
  userName: string;
  userEmail: string;
  userCity: string;
  userNqfLevel: number;
  appliedAt: string;
  status: ApplicationStatus;
  overallMatchScore: number;
  coverLetterNotes?: string;
  notes?: string;
  companyId?: string;
  statusHistory?: ApplicationStatusChange[];
}

export interface ApplicationStatusChange {
  status: ApplicationStatus;
  at: string;
  by: string;
  note?: string;
}

export type AuthRole = 'user' | 'employer' | 'admin';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface SkillAssessmentQuestion {
  id: string;
  skillName: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  eventType:
    | 'AI_SKILL_EXTRACTION'
    | 'AI_JOB_MATCH'
    | 'USER_REGISTRATION'
    | 'USER_LOGIN'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'ACCOUNT_REVOKED'
    | 'ACCOUNT_REACTIVATED'
    | 'PASSWORD_RESET'
    | 'JOB_CREATED'
    | 'JOB_UPDATED'
    | 'JOB_DELETED'
    | 'APPLICATION_SUBMITTED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'ASSESSMENT_COMPLETED'
    | 'REPORT_EXPORTED'
    | 'FAIRNESS_AUDIT'
    | 'SYSTEM_POLICY_AUDIT'
    | 'EMPLOYER_REGISTER'
    | 'EMPLOYER_REGISTRATION'
    | 'EMPLOYER_LOGIN'
    | 'EMPLOYER_UPDATED'
    | 'JOB_SHARED_TO_PROFILES'
    | 'REALTIME_JOURNAL_ENTRY'
    | 'ADMIN_LOGIN'
    | 'LOGIN_FAILED'
    | 'ACCOUNT_LOCKED'
    | 'EMAIL_VERIFIED'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET_REQUESTED'
    | 'USER_CREATED'
    | 'EMPLOYER_CREATED'
    | 'EMPLOYER_DELETED'
    | 'EMPLOYER_STATUS_CHANGED'
    | 'EMPLOYER_PASSWORD_RESET';
  actor: string;
  description: string;
  details?: Record<string, any>;
  fairnessScore?: number;
}

export interface LaborMarketAnalytics {
  totalJobSeekers: number;
  activeJobPostings: number;
  totalApplications: number;
  avgMatchScore: number;
  topDemandedSkills: Array<{ skill: string; count: number; growthRate: string }>;
  topShortageSkills: Array<{ skill: string; demandGapPercent: number }>;
  sectorDistribution: Array<{ sector: string; count: number; avgSalaryZAR: number }>;
  locationDistribution: Array<{ province: string; jobCount: number; candidateCount: number }>;
  experienceDistribution: Array<{ level: string; percentage: number }>;
  ethicalFairnessScore: number | null; // null until a bias-audit measurement exists
}
