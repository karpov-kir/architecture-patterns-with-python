import crypto from 'crypto';

export const randomHash = (prefix?: string) =>
  [prefix, crypto.randomBytes(6).toString('hex')].filter(Boolean).join('-');

export const waitForElementsInArray = async (array: unknown[], timeoutMs = 2000) => {
  let passedMs = 0;
  const delay = 100;

  while (array.length === 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    passedMs += delay;

    if (passedMs >= timeoutMs) {
      throw new Error(`Timeout waiting for elements in an array`);
    }
  }
};
