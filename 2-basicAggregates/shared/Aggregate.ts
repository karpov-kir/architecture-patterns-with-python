import { Entity } from './Entity';

export abstract class Aggregate<
  P extends Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
> extends Entity<P> {
  // There is nothing here in the basic implementation. It is just a placeholder for future extensions (e.g. refer `3-aggregatesAndBasicDomainEvents`).
}
