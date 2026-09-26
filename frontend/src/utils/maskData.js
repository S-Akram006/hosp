/**
 * Mask insurance policy number to reveal only the last 4 characters
 * e.g. "BCBS-987654321" -> "••••-4321"
 * @param {string} policyNumber
 * @returns {string}
 */
export const maskPolicyNumber = (policyNumber) => {
  if (!policyNumber || typeof policyNumber !== 'string') return '••••';
  const clean = policyNumber.trim();
  if (clean.length <= 4) return clean;
  const lastFour = clean.slice(-4);
  return `••••-${lastFour}`;
};

/**
 * Mask phone number showing only last 4 digits
 * e.g. "+1-555-0199" -> "•••-•••-0199"
 * @param {string} phone
 * @returns {string}
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '•••-•••-••••';
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  const lastFour = clean.slice(-4);
  return `•••-•••-${lastFour}`;
};

/**
 * Mask email address showing initial and domain
 * e.g. "sarah.smith@example.com" -> "s••••h@example.com"
 * @param {string} email
 * @returns {string}
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '••••@••••.com';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}•@${domain}`;
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}••••${last}@${domain}`;
};

/**
 * Anonymize patient name for display on clinic monitors
 * e.g. "Gregory House" -> "G•••• H••••"
 * @param {string} name
 * @returns {string}
 */
export const maskName = (name) => {
  if (!name || typeof name !== 'string') return 'Patient';
  return name
    .trim()
    .split(' ')
    .map((part) => (part.length > 1 ? `${part[0]}••••` : part))
    .join(' ');
};

export default {
  maskPolicyNumber,
  maskPhone,
  maskEmail,
  maskName,
};
