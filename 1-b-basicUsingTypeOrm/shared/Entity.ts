import { DeepReadonly } from '../types/DeepReadonly';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WithDomainObjects<T> = T extends Entity<any> ? T : DeepReadonly<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicProps<P extends Record<string, any>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly [Key in keyof P]: P[Key] extends Array<Record<string, any>>
    ? ReadonlyArray<WithDomainObjects<P[Key][number]>>
    : WithDomainObjects<P[Key]>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class Entity<P extends Record<string, any>> {
  public readonly meta: Record<string | symbol, unknown> = {};

  constructor(protected readonly _props: P) {}

  // Use TypeScript to enforce that the `props` are readonly, so all modifications
  // go through the entity's methods to enforce invariants.
  public get props(): PublicProps<P> {
    return this._props as PublicProps<P>;
  }

  public abstract hash(): string;

  public equals(other: Entity<P>) {
    return this.constructor === other.constructor && this.hash() === other.hash();
  }

  public abstract greaterThan?(other: Entity<P>): boolean;
}
