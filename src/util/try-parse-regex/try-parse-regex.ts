import {logWarning} from '#lib';

/**
 * Detects potentially catastrophic backtracking patterns (ReDoS) in regex.
 * Returns true if the pattern is safe, false if it contains dangerous constructs.
 */
function isSafeRegex(pattern: string): boolean {
  // Reject nested quantifiers where a quantified group has an outer quantifier:
  // e.g., (x+)+, (x*)+, (x?)+, (x{1,})+ — these cause exponential backtracking
  // We look for: closing paren followed immediately by +, *, or {n,m}
  // where inside the group there was already a quantifier
  const nestedQuantifier = /\([^)]*[+*][^)]*\)[+*?{]/;
  if (nestedQuantifier.test(pattern)) {
    return false;
  }

  // Reject adjacent quantified atoms: a+a+, a*a+, etc.
  // These can cause polynomial backtracking
  const adjacentQuantified = /([+*])([\w()[\]])\1/;
  if (adjacentQuantified.test(pattern)) {
    return false;
  }

  return true;
}

export function tryParseRegex(s: string): RegExp | null {
  if (!s.startsWith('/')) {
    return null;
  }

  const lastSlashIndex = s.lastIndexOf('/');

  if (lastSlashIndex <= 0) {
    return null;
  }

  const flags = s.slice(lastSlashIndex + 1);

  if (flags && !/^[dgimsuvy]*$/.test(flags)) {
    return null;
  }

  const pattern = s.slice(1, lastSlashIndex);

  // ReDoS protection: reject patterns with catastrophic backtracking potential
  if (!isSafeRegex(pattern)) {
    logWarning(`Potentially dangerous regex pattern rejected (ReDoS risk): ${s}`);
    return null;
  }

  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    if (error instanceof Error) {
      logWarning(error.message);
    } else {
      console.error(error);
    }

    return null;
  }
}
