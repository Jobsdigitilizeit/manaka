import type { Express, Request, Response, NextFunction } from 'express';
import type { AuthRole, UserProfile, CompanyProfile } from '../src/types';
import {
  hashPassword, verifyPassword, burnPasswordCheck, checkPasswordPolicy, passwordPolicyMessage,
  issueCode, checkCode, signToken, verifyToken, rateLimit, lockoutStatus, recordLoginFailure,
  clearLoginFailures, isValidEmail, normaliseEmail,
} from './security';
import { sendMail, MAIL_CONFIGURED } from './mailer';
import { db, recordAudit, persist, sanitizeUser, sanitizeCompany, sanitizeAdmin, type DbUser, type DbCompany, type DbAdmin } from './db';

/* -------------------------------------------------------------------------- */
/*  Types + middleware                                                         */
/* -------------------------------------------------------------------------- */

type Account = DbUser | DbCompany | DbAdmin;

export interface AuthContext {
  role: AuthRole;
  id: string;
  name: string;
  email: string;
}
export type AuthedRequest = Request & { auth: AuthContext };

const SHOW_DEV_CODES = !MAIL_CONFIGURED && process.env.NODE_ENV !== 'production';

export function findAccountById(role: AuthRole, id: string): Account | undefined {
  if (role === 'user') return db.users.find(u => u.id === id);
  if (role === 'employer') return db.companies.find(c => c.id === id);
  return db.admins.find(a => a.id === id);
}

function findAccountByEmail(role: AuthRole, email: string): Account | undefined {
  if (role === 'user') return db.users.find(u => u.email.toLowerCase() === email);
  if (role === 'employer') return db.companies.find(c => c.email.toLowerCase() === email);
  return db.admins.find(a => a.email.toLowerCase() === email);
}

function blockedReason(role: AuthRole, acct: Account): string | null {
  if (role === 'user') {
    const u = acct as DbUser;
    if (u.status === 'revoked' || u.status === 'suspended') {
      return `Account suspended: ${u.statusReason || 'This account has been revoked by administration.'} Contact support@skillix.gov.za.`;
    }
  }
  if (role === 'employer') {
    const c = acct as DbCompany;
    if (c.status === 'suspended') {
      return `Account suspended: ${c.statusReason || 'This employer account has been suspended by administration.'} Contact support@skillix.gov.za.`;
    }
  }
  return null;
}

export function actorLabel(req: Request): string {
  const a = (req as AuthedRequest).auth;
  if (!a) return 'System';
  const prefix = a.role === 'admin' ? 'Admin' : a.role === 'employer' ? 'Employer' : 'Candidate';
  return `${prefix} (${a.email})`;
}

/** Requires a valid session. With roles, the session must also belong to one of them. */
export function requireAuth(...roles: AuthRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const session = token ? verifyToken(token) : null;
    if (!session) {
      return res.status(401).json({ success: false, error: 'Your session has expired. Please sign in again.', code: 'UNAUTHENTICATED' });
    }
    const acct = findAccountById(session.role, session.sub);
    if (!acct || (acct.tokenVersion ?? 1) !== session.ver) {
      return res.status(401).json({ success: false, error: 'Your session is no longer valid. Please sign in again.', code: 'UNAUTHENTICATED' });
    }
    if (blockedReason(session.role, acct)) {
      return res.status(403).json({ success: false, error: 'This account has been suspended.', code: 'SUSPENDED' });
    }
    if (roles.length > 0 && !roles.includes(session.role)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to perform this action.', code: 'FORBIDDEN' });
    }
    (req as AuthedRequest).auth = {
      role: session.role,
      id: acct.id,
      name: (acct as any).name,
      email: (acct as any).email,
    };
    next();
  };
}

/* -------------------------------------------------------------------------- */
/*  Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16);
const today = () => new Date().toISOString().slice(0, 10);

function publicAccount(role: AuthRole, acct: Account) {
  if (role === 'user') return sanitizeUser(acct as DbUser);
  if (role === 'employer') return sanitizeCompany(acct as DbCompany);
  return sanitizeAdmin(acct as DbAdmin);
}

function sessionResponse(role: AuthRole, acct: Account) {
  const token = signToken(acct.id, role, acct.tokenVersion ?? 1);
  const body: Record<string, unknown> = { success: true, token, role, mustChangePassword: Boolean((acct as any).mustChangePassword) };
  if (role === 'user') body.user = publicAccount(role, acct);
  else if (role === 'employer') body.company = publicAccount(role, acct);
  else body.admin = publicAccount(role, acct);
  return body;
}

async function deliverCode(kind: 'verify' | 'reset', role: AuthRole, acct: Account, email: string) {
  const { code, record } = issueCode(email);
  if (kind === 'verify') acct.verifyCode = record;
  else acct.resetCode = record;
  persist();

  const subject = kind === 'verify' ? 'Verify your Skillix email address' : 'Reset your Skillix password';
  const intro = kind === 'verify'
    ? 'Use this code to verify your email address and activate your Skillix account:'
    : 'Use this code to reset your Skillix password:';
  await sendMail({
    to: email,
    subject,
    text: `${intro}\n\n    ${code}\n\nThe code expires in 15 minutes. If you did not request it, you can ignore this email.`,
  });
  return SHOW_DEV_CODES ? { devCode: code } : {};
}

const codeErrors: Record<string, string> = {
  none: 'No active code. Please request a new one.',
  expired: 'This code has expired. Please request a new one.',
  locked: 'Too many incorrect attempts. Please request a new code.',
  invalid: 'That code is not correct. Please check it and try again.',
};

const parseRole = (v: unknown): AuthRole | null => (v === 'user' || v === 'employer' || v === 'admin' ? v : null);

/* -------------------------------------------------------------------------- */
/*  Routes                                                                     */
/* -------------------------------------------------------------------------- */

export function registerAuthRoutes(app: Express) {
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, message: 'Too many attempts from this network. Please wait a few minutes and try again.' });
  const codeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, message: 'Too many code requests. Please wait a few minutes and try again.' });

  async function login(role: AuthRole, rawEmail: unknown, rawPassword: unknown, req: Request, res: Response) {
    if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string' || !rawEmail.trim() || !rawPassword) {
      return res.status(400).json({ success: false, error: 'Email address and password are required.' });
    }
    const email = normaliseEmail(rawEmail);
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const lockKey = `${role}:${email}`;
    const lock = lockoutStatus(lockKey);
    if (lock.locked) {
      return res.status(429).json({ success: false, error: `Too many failed sign-in attempts. Try again in ${lock.retryAfterMin} minute(s) or reset your password.` });
    }

    const acct = findAccountByEmail(role, email);
    const ok = acct ? verifyPassword(rawPassword, acct.passwordHash) : (burnPasswordCheck(rawPassword), false);
    if (!acct || !ok) {
      const lockedNow = recordLoginFailure(lockKey);
      recordAudit('LOGIN_FAILED', email, `Failed ${role} sign-in attempt for ${email}.`, { role, ip: req.ip });
      if (lockedNow) recordAudit('ACCOUNT_LOCKED', email, `Sign-ins for ${email} temporarily locked after repeated failures.`, { role, ip: req.ip });
      return res.status(401).json({ success: false, error: 'Incorrect email or password.' });
    }

    const blocked = blockedReason(role, acct);
    if (blocked) return res.status(403).json({ success: false, revoked: true, error: blocked });

    if ((acct as any).emailVerified === false) {
      const extra = await deliverCode('verify', role, acct, email);
      return res.status(403).json({ success: false, needsVerification: true, email, accountType: role, error: 'Please verify your email address to continue. We sent you a new code.', ...extra });
    }

    clearLoginFailures(lockKey);
    (acct as any).lastLoginAt = stamp();
    if (role === 'user') (acct as DbUser).lastActive = stamp();
    persist();

    const label = role === 'admin' ? 'Administrator' : role === 'employer' ? (acct as DbCompany).name : (acct as DbUser).name;
    recordAudit(
      role === 'admin' ? 'ADMIN_LOGIN' : role === 'employer' ? 'EMPLOYER_LOGIN' : 'USER_LOGIN',
      label,
      `${role === 'admin' ? 'Administrator' : role === 'employer' ? 'Employer' : 'Candidate'} ${email} signed in.`,
      { id: acct.id, ip: req.ip },
    );
    return res.json(sessionResponse(role, acct));
  }

  /* ----------------------------- Sign in ----------------------------- */
  app.post('/api/auth/login', authLimiter, (req, res) => login('user', req.body?.email, req.body?.password, req, res));
  app.post('/api/companies/login', authLimiter, (req, res) => login('employer', req.body?.email, req.body?.password, req, res));
  app.post('/api/auth/admin-login', authLimiter, (req, res) =>
    login('admin', req.body?.email ?? req.body?.username, req.body?.password ?? req.body?.passkey, req, res));

  /* ----------------------------- Registration ----------------------------- */
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { email, password, name, phone, city, province, nqfLevel, totalExperienceYears, expectedSalaryZAR, headline, skills, bio, isEE } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ success: false, error: 'Full name is required.' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'Please provide a valid email address (e.g. candidate@example.co.za).' });
    const policy = checkPasswordPolicy(password);
    if (!policy.isValid) return res.status(400).json({ success: false, error: passwordPolicyMessage(policy) });

    const cleanEmail = normaliseEmail(email);
    if (findAccountByEmail('user', cleanEmail)) {
      return res.status(409).json({ success: false, error: 'An account is already registered with this email address. Please sign in instead.' });
    }

    const nqf = Number(nqfLevel) || 7;
    const years = Number(totalExperienceYears) || 2;
    const skillList: any[] = Array.isArray(skills) && skills.length > 0
      ? skills.slice(0, 60)
      : [{ name: 'Problem Solving', category: 'soft', proficiency: 'Advanced', verifiedByQuiz: false, confidenceScore: 80 }];

    const newUser: DbUser = {
      id: `user-sa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim().slice(0, 120),
      email: cleanEmail,
      phone: typeof phone === 'string' ? phone.slice(0, 30) : '',
      city: city || 'Johannesburg',
      province: province || 'Gauteng',
      headline: headline || 'South African Technology Specialist',
      bio: bio || 'Professional registered on the Skillix labour market portal.',
      nqfLevel: nqf,
      education: [{ institution: 'South African Accredited Institution', degree: 'Qualification (to be updated)', nqfLevel: nqf, yearCompleted: new Date().getFullYear() - 3 }],
      experience: [{
        company: 'Previous Employer (to be updated)',
        role: headline || 'Specialist',
        durationYears: years,
        description: 'Add your role description to improve match accuracy.',
        skillsUsed: skillList.map((s: any) => (typeof s === 'string' ? s : s.name)),
      }],
      totalExperienceYears: years,
      skills: skillList,
      interests: [],
      preferredWorkModel: ['Hybrid', 'Remote'],
      preferredSectors: [],
      expectedSalaryZAR: Number(expectedSalaryZAR) || 0,
      isEE: Boolean(isEE),
      status: 'active',
      isDemo: false,
      emailVerified: false,
      verifiedBadgesCount: 0,
      createdAt: today(),
      lastActive: stamp(),
      passwordHash: hashPassword(password),
      tokenVersion: 1,
    };
    db.users.unshift(newUser);
    recordAudit('USER_REGISTRATION', newUser.name, `New candidate registered: "${newUser.name}" (${newUser.email}), NQF ${newUser.nqfLevel}. Awaiting email verification.`, { userId: newUser.id });

    const extra = await deliverCode('verify', 'user', newUser, cleanEmail);
    persist();
    return res.status(201).json({ success: true, needsVerification: true, email: cleanEmail, accountType: 'user', mailConfigured: MAIL_CONFIGURED, ...extra });
  });

  app.post('/api/companies/register', authLimiter, async (req, res) => {
    const { name, email, password, industry, hqCity, province, website, beeLevel, companySize, about, phone, contactPerson } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ success: false, error: 'Company or organisation name is required.' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'Please enter a valid corporate email (e.g. talent@company.co.za).' });
    const policy = checkPasswordPolicy(password);
    if (!policy.isValid) return res.status(400).json({ success: false, error: passwordPolicyMessage(policy) });

    const cleanEmail = normaliseEmail(email);
    if (findAccountByEmail('employer', cleanEmail)) {
      return res.status(409).json({ success: false, error: 'A company account is already registered with this email. Please sign in instead.' });
    }

    const company: DbCompany = {
      id: `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim().slice(0, 160),
      email: cleanEmail,
      phone: phone || '',
      industry: industry || 'Software & Tech',
      hqCity: hqCity || 'Johannesburg',
      province: province || 'Gauteng',
      website: website || '',
      beeLevel: beeLevel || 'Level 1 B-BBEE',
      companySize: companySize || '50-250 Employees',
      about: about || '',
      // "Verified employer" is a badge an administrator grants - email ownership alone is not enough.
      verifiedEmployer: false,
      activeJobsCount: 0,
      totalApplicantsReceived: 0,
      directSharesCount: 0,
      contactPerson: contactPerson || { name: 'Hiring Lead', role: 'Talent Acquisition', email: cleanEmail },
      status: 'active',
      emailVerified: false,
      createdAt: today(),
      isDemo: false,
      passwordHash: hashPassword(password),
      tokenVersion: 1,
    };
    db.companies.unshift(company);
    recordAudit('EMPLOYER_REGISTRATION', company.name, `New employer registered: "${company.name}" (${company.email}). Awaiting email verification.`, { companyId: company.id });

    const extra = await deliverCode('verify', 'employer', company, cleanEmail);
    return res.status(201).json({ success: true, needsVerification: true, email: cleanEmail, accountType: 'employer', mailConfigured: MAIL_CONFIGURED, ...extra });
  });

  /* ------------------------- Email verification ------------------------- */
  app.post('/api/auth/verify-email', authLimiter, (req, res) => {
    const role = parseRole(req.body?.accountType);
    const { email, code } = req.body ?? {};
    if (!role || role === 'admin' || !isValidEmail(email) || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address and verification code are required.' });
    }
    const clean = normaliseEmail(email);
    const acct = findAccountByEmail(role, clean);
    const result = checkCode(acct?.verifyCode, code, clean);
    if (!acct || result !== 'ok') {
      persist();
      return res.status(400).json({ success: false, error: codeErrors[result === 'ok' ? 'none' : result] });
    }
    acct.verifyCode = undefined;
    (acct as any).emailVerified = true;
    (acct as any).lastLoginAt = stamp();
    persist();
    recordAudit('EMAIL_VERIFIED', clean, `Email address verified for ${role} account ${clean}.`, { id: acct.id });

    const blocked = blockedReason(role, acct);
    if (blocked) return res.status(403).json({ success: false, error: blocked });
    return res.json(sessionResponse(role, acct));
  });

  app.post('/api/auth/resend-code', codeLimiter, async (req, res) => {
    const role = parseRole(req.body?.accountType);
    const email = req.body?.email;
    const generic = { success: true, message: 'If this account is awaiting verification, a new code has been sent.' };
    if (!role || role === 'admin' || !isValidEmail(email)) return res.json(generic);
    const clean = normaliseEmail(email);
    const acct = findAccountByEmail(role, clean);
    if (!acct || (acct as any).emailVerified !== false) return res.json(generic);
    const extra = await deliverCode('verify', role, acct, clean);
    return res.json({ ...generic, ...extra });
  });

  /* --------------------------- Password reset --------------------------- */
  app.post('/api/auth/forgot-password', codeLimiter, async (req, res) => {
    const role = parseRole(req.body?.accountType);
    const email = req.body?.email;
    const generic = { success: true, message: 'If an account exists for that email, we have sent a reset code. It expires in 15 minutes.' };
    if (!role || !isValidEmail(email)) return res.json(generic);
    const clean = normaliseEmail(email);
    const acct = findAccountByEmail(role, clean);
    if (!acct || blockedReason(role, acct)) return res.json(generic);
    const extra = await deliverCode('reset', role, acct, clean);
    recordAudit('PASSWORD_RESET_REQUESTED', clean, `Password reset code requested for ${role} account ${clean}.`, { id: acct.id, ip: req.ip });
    return res.json({ ...generic, ...extra });
  });

  app.post('/api/auth/reset-password', authLimiter, (req, res) => {
    const role = parseRole(req.body?.accountType);
    const { email, code, newPassword } = req.body ?? {};
    if (!role || !isValidEmail(email) || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address, code and new password are required.' });
    }
    const policy = checkPasswordPolicy(newPassword);
    if (!policy.isValid) return res.status(400).json({ success: false, error: passwordPolicyMessage(policy) });

    const clean = normaliseEmail(email);
    const acct = findAccountByEmail(role, clean);
    const result = checkCode(acct?.resetCode, code, clean);
    if (!acct || result !== 'ok') {
      persist();
      return res.status(400).json({ success: false, error: codeErrors[result === 'ok' ? 'none' : result] });
    }
    acct.passwordHash = hashPassword(newPassword);
    acct.tokenVersion = (acct.tokenVersion ?? 1) + 1; // signs out every existing session
    acct.resetCode = undefined;
    (acct as any).mustChangePassword = false;
    if (role !== 'admin') (acct as any).emailVerified = true; // they just proved inbox access
    clearLoginFailures(`${role}:${clean}`);
    persist();
    recordAudit('PASSWORD_CHANGED', clean, `Password reset completed for ${role} account ${clean}.`, { id: acct.id });
    return res.json({ success: true, message: 'Password updated. You can now sign in with your new password.' });
  });

  /* ----------------------- Signed-in account actions ----------------------- */
  app.get('/api/auth/me', requireAuth(), (req, res) => {
    const { role, id } = (req as AuthedRequest).auth;
    const acct = findAccountById(role, id)!;
    const body: Record<string, unknown> = { success: true, role, mustChangePassword: Boolean((acct as any).mustChangePassword) };
    body[role === 'user' ? 'user' : role === 'employer' ? 'company' : 'admin'] = publicAccount(role, acct);
    res.json(body);
  });

  app.post('/api/auth/change-password', requireAuth(), authLimiter, (req, res) => {
    const { role, id, email } = (req as AuthedRequest).auth;
    const { currentPassword, newPassword } = req.body ?? {};
    const acct = findAccountById(role, id)!;
    if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, acct.passwordHash)) {
      return res.status(400).json({ success: false, error: 'Your current password is incorrect.' });
    }
    const policy = checkPasswordPolicy(newPassword);
    if (!policy.isValid) return res.status(400).json({ success: false, error: passwordPolicyMessage(policy) });
    if (newPassword === currentPassword) {
      return res.status(400).json({ success: false, error: 'Your new password must be different from the current one.' });
    }
    acct.passwordHash = hashPassword(newPassword);
    acct.tokenVersion = (acct.tokenVersion ?? 1) + 1;
    (acct as any).mustChangePassword = false;
    persist();
    recordAudit('PASSWORD_CHANGED', email, `${role} ${email} changed their password.`, { id });
    // Return a fresh token so this device stays signed in while all others are signed out.
    return res.json(sessionResponse(role, acct));
  });
}
