import pRetry from 'p-retry';

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

  if (!event.meta) {
    debugger;
  }

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
      console.error(`Could not handle event ${event.constructor.name}`, toPrintableEvent(event), error);
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

export class RetryDecorator<T extends AnyEvent> implements EventHandler<T> {
  constructor(private readonly handler: EventHandler<T>) {}

  public async handle(event: T): Promise<void> {
    pRetry(() => this.handler.handle(event), {
      retries: 3,
      onFailedAttempt: (error) => {
        if (error.retriesLeft === 0) {
          return;
        }

        console.error(
          `Attempt ${error.attemptNumber} to handle ${event.constructor.name}`,
          toPrintableEvent(event),
          `with ${getOriginalConstructorName(this.handler)} has failed, there are ${
            error.retriesLeft
          } retries left, error:`,
          error,
        );
      },
    });
  }
}
