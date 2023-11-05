export type OptionalPropertiesOf<T> = Exclude<
  {
    [Key in keyof T]: T extends Record<Key, T[Key]> ? never : Key;
  }[keyof T],
  undefined
>;

export type RequiredPropertiesOf<T> = keyof Omit<T, OptionalPropertiesOf<T>>;

/**
 * Use `Required<T>` to also return optional functional properties, e.g.:
 * `FunctionalPropertiesOf<{ a: Function; b?: Function; c: string}>` returns `'a' | 'b'`.
 */
export type FunctionalPropertiesOf<T> = Exclude<
  {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [Key in keyof Required<T>]: Required<T>[Key] extends Function ? Key : never;
  }[keyof T],
  undefined
>;

export type NonFunctionalPropertiesOf<T> = keyof Omit<T, FunctionalPropertiesOf<T>>;

export type NonFunctionalRequiredPropertiesOf<T> = Exclude<RequiredPropertiesOf<T>, FunctionalPropertiesOf<T>>;

export type NonFunctionalOptionalPropertiesOf<T> = Exclude<OptionalPropertiesOf<T>, FunctionalPropertiesOf<T>>;

export type MakeSomePartial<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;
