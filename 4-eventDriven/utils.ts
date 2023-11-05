import { ConstructorOf } from './types/ConstructorOf';

const originalConstructorNameSymbol = Symbol('originalConstructorName');

const setOriginalConstructorName = (
  source: Record<
    string | symbol,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
  name: string,
) => {
  source[originalConstructorNameSymbol] = name;
};
export const getOriginalConstructorName = (
  source: Record<
    string | symbol,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
) => {
  return source[originalConstructorNameSymbol] || source.constructor.name;
};

// TODO is there a way to get rid of this `any`?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Decorator = ConstructorOf<any>;

export const addDecorators = <
  T extends Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
>(
  source: T,
  decorators: Decorator[],
) => {
  let decorated = source;
  const name = getOriginalConstructorName(source);

  for (const Decorator of decorators) {
    decorated = new Decorator(decorated);
    setOriginalConstructorName(decorated, name);
  }

  return decorated;
};
