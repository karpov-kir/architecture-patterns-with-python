import { getOriginalConstructorName } from '../utils';
import { ValueObject } from './ValueObject';

export abstract class Event<
  T extends Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
> extends ValueObject<T> {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEvent = Event<any>;

export interface EventHandler<T extends AnyEvent> {
  handle: (event: T) => Promise<void> | undefined;
}

export const getEventName = (event: AnyEvent) => {
  return event.constructor.name;
};

export const toPrintableEvent = (event: AnyEvent) => {
  const data: {
    props: Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >;
    meta?: Record<string | symbol, unknown>;
  } = {
    props: event.props,
  };

  if (Object.keys(event.meta).length > 0 || Object.getOwnPropertySymbols(event.meta).length > 0) {
    data.meta = event.meta;
  }

  return data;
};

/**
 * This decorator is used to:
 * - avoid an error in the handler prevents the other handlers from being executed
 * - avoid an error in the handler breaks the main execution flow
 */
export class NotFailDecorator<T extends AnyEvent> implements EventHandler<T> {
  constructor(private readonly handler: EventHandler<T>) {}

  public async handle(event: T): Promise<void> {
    try {
      await this.handler.handle(event);
    } catch (error) {
      console.error(`Could not handle event ${getEventName(event)}`, toPrintableEvent(event), error);
    }
  }
}

/**
 * This decorator is used to:
 * - run all handlers in background to avoid the main request being delayed because of some side effects (e.g. sending an email)
 */
export class RunInBackgroundDecorator<T extends AnyEvent> implements EventHandler<T> {
  constructor(private readonly handler: EventHandler<T>) {}

  public async handle(event: T): Promise<void> {
    this.handler.handle(event);
  }
}

export class LogDecorator<T extends AnyEvent> implements EventHandler<T> {
  constructor(private readonly handler: EventHandler<T>) {}

  public async handle(event: T): Promise<void> {
    console.log(
      `Handling event ${event.constructor.name}`,
      toPrintableEvent(event),
      `with handler ${getOriginalConstructorName(this.handler)}`,
    );

    await this.handler.handle(event);
  }
}
