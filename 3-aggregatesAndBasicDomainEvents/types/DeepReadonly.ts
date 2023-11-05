import { NonFunctionalOptionalPropertiesOf, NonFunctionalRequiredPropertiesOf } from './Common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Collection = Map<any, any> | Set<any> | Array<any>;

export type ReadonlyDate = Readonly<
  Omit<
    Date,
    | 'setTime'
    | 'setMilliseconds'
    | 'setUTCMilliseconds'
    | 'setSeconds'
    | 'setUTCSeconds'
    | 'setMinutes'
    | 'setUTCMinutes'
    | 'setHours'
    | 'setUTCHours'
    | 'setDate'
    | 'setUTCDate'
    | 'setMonth'
    | 'setUTCMonth'
    | 'setFullYear'
    | 'setUTCFullYear'
  >
>;

export type MaybeReadonlyCollection<T> = T extends Set<infer SetValue>
  ? ReadonlySet<DeepReadonly<SetValue>>
  : T extends Map<infer MapKey, infer MapValue>
    ? ReadonlyMap<DeepReadonly<MapKey>, DeepReadonly<MapValue>>
    : T extends Array<infer ArrayValue>
      ? ReadonlyArray<DeepReadonly<ArrayValue>>
      : T;

export type DeepReadonly<T> = T extends Collection
  ? MaybeReadonlyCollection<T>
  : T extends Date
    ? ReadonlyDate
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T extends Record<string, any>
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          readonly [P in NonFunctionalRequiredPropertiesOf<T>]: T[P] extends Record<string, any>
            ? DeepReadonly<T[P]>
            : MaybeReadonlyCollection<T[P]>;
        } & {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          readonly [P in NonFunctionalOptionalPropertiesOf<T>]?: T[P] extends Record<string, any>
            ? DeepReadonly<T[P]>
            : MaybeReadonlyCollection<T[P]>;
        }
      : T;
