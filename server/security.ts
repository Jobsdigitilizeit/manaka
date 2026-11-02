import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRole } from '../src/types';

/* -------------------------------------------------------------------------- */
/*  Secrets                                                                    */
/* -------------------------------------------------------------------------- */

// Sessions are signed with AUTH_SECRET. If it is not configured a random secret is
// generated per process, which means every restart signs everyone out.
const AUTH_SECRET: string = process.env.AUTH_SECRET || crypto.randomBytes(48).toString('hex');
export const AUTH_SECRET_IS_EPHEMERAL = !process.env.AUTH_SECRET;

/* -------------------------------------------------------------------------- */
/*  Password hashing (scrypt)                                                  */
/* -------------------------------------------------------------------------- */

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored?: string): boolean {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, SCRYPT_PARAMS);
  return crypto.timingSafeEqual(actual, expected);
}

// Used to keep response time similar whether or not an account exists.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));
export function burnPasswordCheck(password: string) {
  verifyPassword(password, DUMMY_HASH);
}

export interface PasswordCheck {
  isValid: boolean;
  errors: string[];
}

export function checkPasswordPolicy(password: unknown): PasswordCheck {
  const errors: string[] = [];
  if (typeof password !== 'string') return { isValid: false, errors: ['Password is required.'] };
  if (password.length < 10) errors.push('at least 10 characters');
  if (password.length > 128) errors.push('no more than 128 characters');
  if (!/[a-z]/.test(password)) errors.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('an uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('a special character');
  return { isValid: errors.length === 0, errors };
}

export function passwordPolicyMessage(check: PasswordCheck): string {
  return `Password must contain ${check.errors.join(', ')}.`;
}

/** Cryptographically random password that always satisfies the password policy. */
export function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const chars = [pick(upper), pick(upper), pick(lower), pick(lower), pick(lower), pick(lower), pick(digits), pick(digits), pick(symbols), pick(lower), pick(upper), pick(digits)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/* -------------------------------------------------------------------------- */
/*  One-time codes (email verification / password reset)                       */
/* -------------------------------------------------------------------------- */

export interface OneTimeCode {
  hash: string;
  expiresAt: number;
  attempts: number;
}

const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;

function hashCode(code: string, email: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(`${email}:${code}`).digest('hex');
}

export function issueCode(email: string): { code: string; record: OneTimeCode } {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  return { code, record: { hash: hashCode(code, email), expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 } };
}

export type CodeResult = 'ok' | 'invalid' | 'expired' | 'locked' | 'none';

/** Mutates `record.attempts`. Caller clears the stored record on 'ok'. */
export function checkCode(record: OneTimeCode | undefined, code: string, email: string): CodeResult {
  if (!record) return 'none';
  if (Date.now() > record.expiresAt) return 'expired';
  if (record.attempts >= CODE_MAX_ATTEMPTS) return 'locked';
  record.attempts += 1;
  const given = Buffer.from(hashCode(String(code).trim(), email), 'hex');
  const want = Buffer.from(record.hash, 'hex');
  return given.length === want.length && crypto.timingSafeEqual(given, want) ? 'ok' : 'invalid';
}

/* -------------------------------------------------------------------------- */
/*  Signed session tokens                                                      */
/* -------------------------------------------------------------------------- */

export interface Session {
  sub: string;
  role: AuthRole;
  ver: number;
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS: Record<AuthRole, number> = {
  admin: 8 * 60 * 60,
  employer: 12 * 60 * 60,
  user: 12 * 60 * 60,
};

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

export function signToken(sub: string, role: AuthRole, ver: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: Session = { sub, role, ver, iat: now, exp: now + TOKEN_TTL_SECONDS[role] };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): Session | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session;
    if (!payload.sub || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Rate limiting + brute-force lockout (in memory)                            */
/* -------------------------------------------------------------------------- */

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  const buckets = new Map<string, Bucket>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }, opts.windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: opts.message || 'Too many requests. Please try again shortly.' });
    }
    next();
  };
}

const LOCK_THRESHOLD = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number; firstAt: number }>();

export function lockoutStatus(key: string): { locked: boolean; retryAfterMin: number } {
  const f = failures.get(key);
  if (f && f.lockedUntil > Date.now()) return { locked: true, retryAfterMin: Math.ceil((f.lockedUntil - Date.now()) / 60000) };
  return { locked: false, retryAfterMin: 0 };
}

/** Returns true when this failure triggered a new lockout. */
export function recordLoginFailure(key: string): boolean {
  const now = Date.now();
  let f = failures.get(key);
  if (!f || now - f.firstAt > LOCK_WINDOW_MS) f = { count: 0, lockedUntil: 0, firstAt: now };
  f.count += 1;
  const lockedNow = f.count >= LOCK_THRESHOLD;
  if (lockedNow) f.lockedUntil = now + LOCK_WINDOW_MS;
  failures.set(key, f);
  return lockedNow;
}

export function clearLoginFailures(key: string) {
  failures.delete(key);
}

/* -------------------------------------------------------------------------- */
/*  Misc helpers                                                               */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const isValidEmail = (email: unknown): email is string => typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email.trim());
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}
