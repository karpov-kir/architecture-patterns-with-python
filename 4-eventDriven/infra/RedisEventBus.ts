import redis from 'redis';

import { EventBusPort } from '../ports/EventBusPort';
import { AnyEvent, EventHandler, toPrintableEvent } from '../shared/Event';
import { ConstructorOf } from '../types/ConstructorOf';
import { getOriginalConstructorName } from '../utils';

type RedisClient = ReturnType<typeof redis.createClient>;

export class RedisEventBus implements EventBusPort {
  private static instancePromises?: Promise<{
    publisherInstance: RedisClient;
    subscriberInstance: RedisClient;
  }>;

  public static async destroy() {
    if (!this.instancePromises) {
      console.warn('Trying to destroy an event bus that is not initialized');
      return;
    }

    const { publisherInstance, subscriberInstance } = await this.instancePromises;

    await Promise.all([publisherInstance.quit(), subscriberInstance.quit()]);

    this.instancePromises = undefined;
  }

  public static async create(): Promise<RedisEventBus> {
    if (!this.instancePromises) {
      const publisherInstance = redis.createClient({
        name: 'EventBusPublisher',
        // redis[s]://[[username][:password]@][host][:port][/db-number]
        url: 'redis://127.0.0.1:6379',
      });
      const subscriberInstance = publisherInstance.duplicate({
        name: 'EventBusSubscriber',
      });

      this.instancePromises = Promise.all(
        [publisherInstance, subscriberInstance].map((instance) => instance.connect()),
      ).then(([publisherInstance, subscriberInstance]) => ({ publisherInstance, subscriberInstance }));
    }

    const { publisherInstance, subscriberInstance } = await this.instancePromises;

    return new RedisEventBus(publisherInstance, subscriberInstance);
  }

  private constructor(
    private readonly publisher: RedisClient,
    private readonly subscriber: RedisClient,
  ) {}

  public async subscribe<T extends AnyEvent>(
    Event: ConstructorOf<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: EventHandler<any>,
  ) {
    console.log(`Subscribing ${getOriginalConstructorName(handler)} to event ${Event.name} [${this.constructor.name}]`);

    const redisHandler = (message: string) => {
      handler.handle(new Event(JSON.parse(message)));
    };

    await this.subscriber.subscribe(Event.name, redisHandler);
  }

  public async publish<T extends AnyEvent>(event: T): Promise<void> {
    console.log(`Publishing event ${event.constructor.name}`, toPrintableEvent(event), `[${this.constructor.name}]`);

    await this.publisher.publish(event.constructor.name, JSON.stringify(event.props));
  }

  public async publishMany<T extends AnyEvent>(events: ReadonlyArray<T>): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }
}
