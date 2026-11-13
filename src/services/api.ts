import { JobPosting, UserProfile, JobApplication, JobMatchResult, LaborMarketAnalytics, SystemAuditLog, CompanyProfile, AdminAccount, AuthRole } from '../types';

/* -------------------------------------------------------------------------- */
/*  Session handling                                                           */
/* -------------------------------------------------------------------------- */

const TOKEN_KEY = 'skillix.session';
let expireHandler: (() => void) | null = null;

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let memoryToken: string | null = readToken();

export const session = {
  get token() {
    return memoryToken;
  },
  set(token: string) {
    memoryToken = token;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode: the in-memory copy still works for this tab */
    }
  },
  clear() {
    memoryToken = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
  /** Called once when the server rejects the stored session (expired, password changed, suspended). */
  onExpire(handler: () => void) {
    expireHandler = handler;
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function send(path: string, method: string, body?: unknown): Promise<{ status: number; ok: boolean; json: any }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (memoryToken) headers.Authorization = `Bearer ${memoryToken}`;

  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (res.status === 401 && memoryToken && json?.code === 'UNAUTHENTICATED') {
    session.clear();
    expireHandler?.();
  }
  return { status: res.status, ok: res.ok, json };
}

/** Returns the parsed body whatever the status - callers read `success` / `error` themselves. */
async function raw<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await send(path, method, body);
  // Sign-in, verification and password-change responses carry the new session token.
  if (r.ok && typeof r.json?.token === 'string') session.set(r.json.token);
  return { ...r.json, httpStatus: r.status } as T;
}

/** Returns the parsed body, or throws ApiError carrying the server's message. */
async function request<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await send(path, method, body);
  if (!r.ok) throw new ApiError(r.json?.error || `Request failed (${r.status})`, r.status);
  return r.json as T;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AuthResult {
  success: boolean;
  error?: string;
  revoked?: boolean;
  token?: string;
  role?: AuthRole;
  user?: UserProfile;
  company?: CompanyProfile;
  admin?: AdminAccount;
  mustChangePassword?: boolean;
  /** Account exists but the email address has not been verified yet. */
  needsVerification?: boolean;
  email?: string;
  accountType?: AuthRole;
}

export interface HumanChallengeAnswer {
  challengeId: string;
  answer: string;
  website: string;
}

export type ReportType = 'overview' | 'users' | 'employers' | 'applications' | 'vacancies' | 'audit';

export interface LabelCount {
  label: string;
  count: number;
}

export interface ReportEnvelope {
  success: boolean;
  type: ReportType;
  generatedAt: string;
  generatedBy: string;
  period: { from: string | null; to: string | null };
  [key: string]: any;
}

export interface AdminCompany extends CompanyProfile {
  totalJobsCount?: number;
}

export interface CredentialResult<T> {
  success: boolean;
  password: string;
  user?: UserProfile;
  company?: AdminCompany;
  admin?: AdminAccount;
  [key: string]: any;
}

/* -------------------------------------------------------------------------- */
/*  API                                                                        */
/* -------------------------------------------------------------------------- */

export const api = {
  // 0. Authentication
  /** Single sign-in for job seekers, employers and administrators; the server detects which. */
  signIn: (email: string, password: string) => raw<AuthResult>('/api/auth/signin', 'POST', { email, password }),
  loginCandidate: (email: string, password: string) => raw<AuthResult>('/api/auth/login', 'POST', { email, password }),
  registerCandidate: (userData: Partial<UserProfile> & { password: string; human: HumanChallengeAnswer }) => raw<AuthResult>('/api/auth/register', 'POST', userData),
  loginAdmin: (email: string, password: string) => raw<AuthResult>('/api/auth/admin-login', 'POST', { email, password }),
  loginCompany: (email: string, password: string) => raw<AuthResult>('/api/companies/login', 'POST', { email, password }),
  registerCompany: (companyData: Partial<CompanyProfile> & { password: string; human: HumanChallengeAnswer }) => raw<AuthResult>('/api/companies/register', 'POST', companyData),

  getHumanChallenge: () => raw<{ success: boolean; challengeId?: string; question?: string; error?: string }>('/api/auth/human-challenge'),
  confirmEmail: (token: string) => raw<AuthResult>('/api/auth/confirm-email', 'POST', { token }),
  resendVerification: (accountType: AuthRole, email: string) => raw<{ success: boolean; message?: string }>('/api/auth/resend-verification', 'POST', { accountType, email }),
  forgotPassword: (accountType: AuthRole | 'any', email: string) => raw<{ success: boolean; message?: string; devCode?: string; error?: string }>('/api/auth/forgot-password', 'POST', { accountType, email }),
  resetPassword: (accountType: AuthRole | 'any', email: string, code: string, newPassword: string) =>
    raw<{ success: boolean; message?: string; error?: string }>('/api/auth/reset-password', 'POST', { accountType, email, code, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) => raw<AuthResult>('/api/auth/change-password', 'POST', { currentPassword, newPassword }),
  me: () => raw<AuthResult>('/api/auth/me'),

  // 0b. Employer / Company
  async getCompanies(): Promise<CompanyProfile[]> {
    const data = await request('/api/companies');
    return data.companies || [];
  },

  getCompany: (id: string) => request<{ company: CompanyProfile }>(`/api/companies/${id}`),
  updateCompany: (id: string, updates: Partial<CompanyProfile>) => request<{ success: boolean; company: CompanyProfile }>(`/api/companies/${id}`, 'PUT', updates),
  shareJobWithCandidates: (jobId: string, candidateIds: string[], notes?: string) =>
    request<{ success: boolean; message: string; job: JobPosting }>(`/api/jobs/${jobId}/share`, 'POST', { candidateIds, notes }),

  async getEmployerApplications(params?: { companyId?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.companyId) query.set('companyId', params.companyId);
    const data = await request(`/api/employer/applications?${query.toString()}`);
    return data.applications || [];
  },

  async searchEmployerTalent(params?: { skills?: string; city?: string; province?: string; nqfLevel?: number; isEE?: boolean; search?: string; jobId?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.skills) query.set('skills', params.skills);
    if (params?.city) query.set('city', params.city);
    if (params?.province) query.set('province', params.province);
    if (params?.nqfLevel) query.set('nqfLevel', String(params.nqfLevel));
    if (params?.isEE !== undefined) query.set('isEE', String(params.isEE));
    if (params?.search) query.set('search', params.search);
    if (params?.jobId) query.set('jobId', params.jobId);
    const data = await request(`/api/employer/talent-search?${query.toString()}`);
    return data.results || [];
  },

  // 1. Health
  checkHealth: () => raw<{ status: string; totalJobs: number; totalUsers: number; totalEmployers: number }>('/api/health'),

  // 2. Jobs
  async getJobs(params?: { sector?: string; location?: string; workModel?: string; search?: string; includeInactive?: boolean }): Promise<JobPosting[]> {
    const query = new URLSearchParams();
    if (params?.sector) query.set('sector', params.sector);
    if (params?.location) query.set('location', params.location);
    if (params?.workModel) query.set('workModel', params.workModel);
    if (params?.search) query.set('search', params.search);
    if (params?.includeInactive) query.set('includeInactive', 'true');
    const data = await request(`/api/jobs?${query.toString()}`);
    return data.jobs || [];
  },

  async createJob(job: Partial<JobPosting>): Promise<JobPosting> {
    return (await request('/api/jobs', 'POST', job)).job;
  },

  async updateJob(id: string, updates: Partial<JobPosting>): Promise<JobPosting> {
    return (await request(`/api/jobs/${id}`, 'PUT', updates)).job;
  },

  async deleteJob(id: string): Promise<boolean> {
    return (await request(`/api/jobs/${id}`, 'DELETE')).success;
  },

  async generateJobWithAI(params: { title: string; sector?: string; city?: string; experienceLevel?: string; keySkills?: string }) {
    return (await request('/api/jobs/generate-ai', 'POST', params)).generated;
  },

  // 3. Users (candidates)
  async getUsers(): Promise<UserProfile[]> {
    return (await request('/api/users')).users || [];
  },

  async getUser(id: string): Promise<UserProfile> {
    return (await request(`/api/users/${id}`)).user;
  },

  /** A signed-in candidate saves their own profile. */
  async saveUser(user: Partial<UserProfile>): Promise<UserProfile> {
    return (await request('/api/users', 'POST', user)).user;
  },

  /** Administrator edit of a candidate profile. */
  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return (await request(`/api/users/${id}`, 'PUT', updates)).user;
  },

  async updateUserStatus(id: string, status: 'active' | 'revoked' | 'suspended', reason?: string): Promise<UserProfile> {
    return (await request(`/api/users/${id}/status`, 'PUT', { status, reason })).user;
  },

  resetUserPassword: (id: string, customPassword?: string) =>
    request<CredentialResult<UserProfile> & { user: UserProfile }>(`/api/users/${id}/reset-password`, 'POST', { customPassword }),

  deleteUser: (id: string) => request<{ success: boolean; message: string; removedApplications: number }>(`/api/users/${id}`, 'DELETE'),

  // 3b. Administrator account management
  createUser: (data: Partial<UserProfile> & { password?: string }) => request<CredentialResult<UserProfile> & { user: UserProfile }>('/api/admin/users', 'POST', data),
  verifyUserEmail: (id: string) => request<{ user: UserProfile }>(`/api/admin/users/${id}/verify-email`, 'POST'),

  async getAdminCompanies(): Promise<AdminCompany[]> {
    return (await request('/api/admin/companies')).companies || [];
  },
  createCompany: (data: Partial<CompanyProfile> & { password?: string; contactName?: string }) =>
    request<CredentialResult<AdminCompany> & { company: AdminCompany }>('/api/admin/companies', 'POST', data),
  async updateAdminCompany(id: string, updates: Partial<CompanyProfile>): Promise<AdminCompany> {
    return (await request(`/api/admin/companies/${id}`, 'PUT', updates)).company;
  },
  async setCompanyStatus(id: string, status: 'active' | 'suspended', reason?: string): Promise<AdminCompany> {
    return (await request(`/api/admin/companies/${id}/status`, 'PUT', { status, reason })).company;
  },
  resetCompanyPassword: (id: string, customPassword?: string) =>
    request<CredentialResult<AdminCompany> & { company: AdminCompany }>(`/api/admin/companies/${id}/reset-password`, 'POST', { customPassword }),
  async verifyCompanyEmail(id: string): Promise<AdminCompany> {
    return (await request(`/api/admin/companies/${id}/verify-email`, 'POST')).company;
  },
  deleteCompany: (id: string) => request<{ success: boolean; removedJobs: number; removedApplications: number }>(`/api/admin/companies/${id}`, 'DELETE'),

  async getAdmins(): Promise<AdminAccount[]> {
    return (await request('/api/admin/admins')).admins || [];
  },
  createAdmin: (data: { name: string; email: string; password?: string }) =>
    request<CredentialResult<AdminAccount> & { admin: AdminAccount }>('/api/admin/admins', 'POST', data),
  resetAdminPassword: (id: string, customPassword?: string) =>
    request<CredentialResult<AdminAccount> & { admin: AdminAccount }>(`/api/admin/admins/${id}/reset-password`, 'POST', { customPassword }),
  deleteAdmin: (id: string) => request<{ success: boolean }>(`/api/admin/admins/${id}`, 'DELETE'),

  // Reports (JSON feed for the PDF generator)
  getReport: (type: ReportType, range?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (range?.from) q.set('from', range.from);
    if (range?.to) q.set('to', range.to);
    return request<ReportEnvelope>(`/api/admin/reports/${type}?${q.toString()}`);
  },

  recordJournalEntry: (entry: Partial<SystemAuditLog>) => request<{ success: boolean; log: SystemAuditLog }>('/api/audit-logs/journal', 'POST', entry),

  // 4. AI Skills & Matching
  async parseCVWithAI(cvText: string, fileName?: string) {
    return (await request('/api/ai/parse-cv', 'POST', { cvText, fileName })).parsedData;
  },

  async matchSkillsAndJobs(userProfile: UserProfile, jobId?: string): Promise<JobMatchResult[]> {
    return (await request('/api/ai/skill-gap-match', 'POST', { userProfile, jobId })).matches || [];
  },

  async generateCareerRoadmap(userProfile: UserProfile, targetRole?: string) {
    return (await request('/api/ai/career-roadmap', 'POST', { userProfile, targetRole })).roadmap;
  },

  // 5. Applications
  async getApplications(params?: { userId?: string; jobId?: string }): Promise<JobApplication[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.jobId) query.set('jobId', params.jobId);
    return (await request(`/api/applications?${query.toString()}`)).applications || [];
  },

  async submitApplication(application: Partial<JobApplication>): Promise<JobApplication> {
    return (await request('/api/applications', 'POST', application)).application;
  },

  applyForJob(params: { jobId: string; coverNotes?: string }): Promise<JobApplication> {
    return this.submitApplication({ jobId: params.jobId, coverLetterNotes: params.coverNotes });
  },

  async updateApplicationStatus(id: string, status: string, notes?: string): Promise<JobApplication> {
    return (await request(`/api/applications/${id}/status`, 'PUT', { status, notes })).application;
  },

  // 6. Analytics & Audit
  async getAnalytics(): Promise<LaborMarketAnalytics> {
    return (await request('/api/analytics')).analytics;
  },

  async getAuditLogs(): Promise<SystemAuditLog[]> {
    return (await request('/api/audit-logs')).auditLogs || [];
  },
};
