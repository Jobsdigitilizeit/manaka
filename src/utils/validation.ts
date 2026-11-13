/**
 * Authentication and Form Validation Utilities for Skillix
 * Strict RFC Email validation and NIST-compliant Password strength checks
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 5
  strengthLabel: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  rules: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  errors: string[];
}

const LOCAL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?$/;
const LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const TLD_RE = /^[A-Za-z]{2,24}$/;

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const value = typeof email === 'string' ? email.trim() : '';
  if (!value) return { isValid: false, error: 'Email address is required.' };
  if (value.length > 254) return { isValid: false, error: 'That email address is too long.' };
  if (/\s/.test(value)) return { isValid: false, error: 'Email cannot contain spaces.' };

  const parts = value.split('@');
  if (parts.length < 2) return { isValid: false, error: 'Email must contain an "@" (e.g. name@example.co.za).' };
  if (parts.length > 2) return { isValid: false, error: 'Email cannot contain more than one "@".' };

  const [local, domain] = parts;
  if (!local) return { isValid: false, error: 'Enter the part before the "@" (e.g. name@example.co.za).' };
  if (!LOCAL_RE.test(local) || local.includes('..')) return { isValid: false, error: 'The part before the "@" is not valid.' };
  if (!domain) return { isValid: false, error: 'Enter a domain after the "@" (e.g. example.co.za).' };

  const labels = domain.split('.');
  if (labels.length < 2 || labels.some(l => l === '')) {
    return { isValid: false, error: 'The domain must look like example.co.za. It cannot start or end with a dot or be missing a name.' };
  }
  if (!labels.every(l => LABEL_RE.test(l))) return { isValid: false, error: 'The domain contains invalid characters.' };
  if (!TLD_RE.test(labels[labels.length - 1])) return { isValid: false, error: 'The domain must end in a valid extension such as .com or .co.za.' };
  return { isValid: true };
}

export function validatePassword(password: string): PasswordValidationResult {
  const rules = {
    minLength: (password || '').length >= 10,
    hasUpper: /[A-Z]/.test(password || ''),
    hasLower: /[a-z]/.test(password || ''),
    hasNumber: /[0-9]/.test(password || ''),
    hasSpecial: /[^A-Za-z0-9]/.test(password || ''),
  };

  const passedRulesCount = Object.values(rules).filter(Boolean).length;
  const errors: string[] = [];

  if (!rules.minLength) errors.push('At least 10 characters required');
  if (!rules.hasUpper) errors.push('Include at least 1 uppercase letter (A-Z)');
  if (!rules.hasLower) errors.push('Include at least 1 lowercase letter (a-z)');
  if (!rules.hasNumber) errors.push('Include at least 1 numeric digit (0-9)');
  if (!rules.hasSpecial) errors.push('Include at least 1 special character (!@#$%^&*)');

  let strengthLabel: PasswordValidationResult['strengthLabel'] = 'Very Weak';
  if (passedRulesCount === 5) strengthLabel = 'Strong';
  else if (passedRulesCount === 4) strengthLabel = 'Good';
  else if (passedRulesCount === 3) strengthLabel = 'Fair';
  else if (passedRulesCount === 2) strengthLabel = 'Weak';

  return {
    isValid: passedRulesCount === 5,
    score: passedRulesCount,
    strengthLabel,
    rules,
    errors,
  };
}

export function validatePasswordMatch(pass1: string, pass2: string): { isMatch: boolean; error?: string } {
  if (!pass2) {
    return { isMatch: false, error: 'Please confirm your password.' };
  }
  if (pass1 !== pass2) {
    return { isMatch: false, error: 'Passwords do not match. Please verify.' };
  }
  return { isMatch: true };
}
