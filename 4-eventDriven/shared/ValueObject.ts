import isEqual from 'lodash.isequal';

import { DeepReadonly } from '../types/DeepReadonly';

export abstract class ValueObject<
  T extends Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
> {
  public readonly meta: Record<string | symbol, unknown> = {};

  constructor(public readonly props: DeepReadonly<T>) {}

  public equals(other: ValueObject<T>) {
    return isEqual(this.props, other.props);
  }
}
