import { Entity } from './Entity';
import { AnyEvent } from './Event';

export abstract class Aggregate<
  P extends Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
> extends Entity<P> {
  protected _events: AnyEvent[] = [];

  public get events(): ReadonlyArray<AnyEvent> {
    return this._events;
  }
}
