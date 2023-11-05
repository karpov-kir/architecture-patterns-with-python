import { EventBusPort } from '../../ports/EventBusPort';
import { AnyEvent, EventHandler, toPrintableEvent } from '../../shared/Event';
import { ConstructorOf } from '../../types/ConstructorOf';
import { getOriginalConstructorName } from '../../utils';
import { MultiChannelPubSub } from './PubSub';

export class InMemoryEventBus implements EventBusPort {
  private multiChannelPubSub = new MultiChannelPubSub<Map<ConstructorOf<AnyEvent>, EventHandler<AnyEvent>>>();

  public subscribe<T extends AnyEvent>(Event: ConstructorOf<T>, handler: EventHandler<T>) {
    console.log(
      `Subscribing ${getOriginalConstructorName(handler)} to event ${Event.name}`,
      `[${this.constructor.name}]`,
    );

    this.multiChannelPubSub.subscribe(Event, handler as EventHandler<AnyEvent>);

    return Promise.resolve();
  }

  public publish<T extends AnyEvent>(event: T): Promise<void> {
    console.log(`Publishing event ${event.constructor.name}`, toPrintableEvent(event), `[${this.constructor.name}]`);
    return this.multiChannelPubSub.publish(event.constructor as ConstructorOf<AnyEvent>, event);
  }

  public async publishMany<T extends AnyEvent>(events: ReadonlyArray<T>): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }
}
