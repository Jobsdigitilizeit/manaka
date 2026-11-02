import crypto from 'crypto';
import { INITIAL_JOBS, INITIAL_USERS, INITIAL_COMPANIES } from '../src/data/mockData';
import type { JobPosting, UserProfile, JobApplication, SystemAuditLog, CompanyProfile, AdminAccount } from '../src/types';
import { hashPassword, generateTempPassword, type OneTimeCode } from './security';
import { loadSnapshot, scheduleSave, saveNow } from './store';

/** Server-only credential fields. These must never be serialised to a client. */
export interface AuthFields {
  passwordHash?: string;
  tokenVersion?: number;
  verifyCode?: OneTimeCode;
  resetCode?: OneTimeCode;
}

export type DbUser = UserProfile & AuthFields;
export type DbCompany = CompanyProfile & AuthFields;
export interface DbAdmin extends AdminAccount, AuthFields {}

interface Snapshot {
  jobs: JobPosting[];
  users: DbUser[];
  companies: DbCompany[];
  applications: JobApplication[];
  auditLogs: SystemAuditLog[];
  admins: DbAdmin[];
}

const nowStamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const snapshot = loadSnapshot<Snapshot>();

export const db: Snapshot = {
  jobs: snapshot?.jobs ?? [...INITIAL_JOBS],
  users: snapshot?.users ?? ([...INITIAL_USERS] as DbUser[]),
  companies: snapshot?.companies ?? ([...INITIAL_COMPANIES] as DbCompany[]),
  applications: snapshot?.applications ?? [],
  auditLogs: snapshot?.auditLogs ?? [
    {
      id: 'log-sys-001',
      timestamp: nowStamp(),
      eventType: 'SYSTEM_POLICY_AUDIT',
      actor: 'Skillix Core Engine',
      description: 'Labour market platform initialised in live production mode. Awaiting user and employer registrations.',
      fairnessScore: 99.2,
    },
  ],
  admins: snapshot?.admins ?? [],
};

export const getSnapshot = () => db;
export const persist = () => scheduleSave(getSnapshot);
export const persistNow = () => saveNow(getSnapshot);

/** Create the first administrator from the environment, or generate a one-off password. */
export function seedAdmin() {
  if (db.admins.length > 0) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@skillix.gov.za').trim().toLowerCase();
  const configured = process.env.ADMIN_PASSWORD;
  const password = configured || generateTempPassword();
  db.admins.push({
    id: `admin-${crypto.randomBytes(6).toString('hex')}`,
    name: process.env.ADMIN_NAME || 'Platform Administrator',
    email,
    passwordHash: hashPassword(password),
    tokenVersion: 1,
    mustChangePassword: !configured,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  persistNow();
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(' Initial administrator account created');
  console.log(`   Email:    ${email}`);
  if (configured) {
    console.log('   Password: taken from ADMIN_PASSWORD');
  } else {
    console.log(`   Password: ${password}`);
    console.log('   (shown once - you will be asked to change it at first sign-in)');
  }
  console.log('──────────────────────────────────────────────────────────────\n');
}

export function recordAudit(
  eventType: SystemAuditLog['eventType'],
  actor: string,
  description: string,
  details?: Record<string, any>,
  fairnessScore?: number,
) {
  const entry: SystemAuditLog = {
    id: `log-${Date.now()}-${crypto.randomInt(0, 100000)}`,
    timestamp: nowStamp(),
    eventType,
    actor,
    description,
    details,
    fairnessScore,
  };
  db.auditLogs.unshift(entry);
  // Keep a generous trail; reports and the tracker rely on it.
  if (db.auditLogs.length > 5000) db.auditLogs.length = 5000;
  persist();
  return entry;
}

/* ---------------------------- Response sanitisers --------------------------- */

const CREDENTIAL_KEYS = ['password', 'passwordHash', 'tokenVersion', 'verifyCode', 'resetCode'] as const;

function strip<T extends object>(obj: T): T {
  const copy: any = { ...obj };
  for (const k of CREDENTIAL_KEYS) delete copy[k];
  return copy;
}

export const sanitizeUser = (u: DbUser): UserProfile => strip(u);
export const sanitizeCompany = (c: DbCompany): CompanyProfile => strip(c);
export const sanitizeAdmin = (a: DbAdmin): AdminAccount => strip(a);

/** What an unauthenticated visitor may see about an employer. */
export function publicCompany(c: DbCompany): Partial<CompanyProfile> {
  return {
    id: c.id,
    name: c.name,
    logo: c.logo,
    industry: c.industry,
    sector: c.sector,
    hqCity: c.hqCity,
    city: c.city,
    province: c.province,
    website: c.website,
    beeLevel: c.beeLevel,
    bbbeeLevel: c.bbbeeLevel,
    companySize: c.companySize,
    about: c.about,
    description: c.description,
    verifiedEmployer: c.verifiedEmployer,
    isVerified: c.isVerified,
  };
}

export const todayStamp = nowStamp;
