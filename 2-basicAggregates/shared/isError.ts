export const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

export function assertError(error: unknown): asserts error is Error {
  if (!isError(error)) {
    throw new Error(`Unexpected error ${error}`);
  }
}
