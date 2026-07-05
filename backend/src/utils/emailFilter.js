/**
 * List of common temporary / disposable email provider domains.
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'yopmail.com',
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'maildrop.cc',
  'throwawaymail.com',
  'tempmailaddress.com',
  'boun.cr',
  'trbvm.com',
  'zillamail.com'
]);

/**
 * Checks if the given email belongs to a blacklisted disposable domain.
 * @param {string} email
 * @returns {boolean} True if disposable, false otherwise
 */
export const isDisposableEmail = (email) => {
  if (!email || typeof email !== 'string') return true;
  const parts = email.split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1].toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
};
