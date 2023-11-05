import crypto from 'crypto';

export const randomHash = (prefix?: string) =>
  [prefix, crypto.randomBytes(6).toString('hex')].filter(Boolean).join('-');
