import { AnyEvent, EventHandler, getEventName, toPrintableEvent } from '../../shared/Event';
import { ConstructorOf } from '../../types/ConstructorOf';
import { getOriginalConstructorName } from '../../utils';
import { MultiChannelPubSub } from './PubSub';

/**
 * I think that an in memory implementation is sufficient for internal events only in simple cases.
 * So there is no port for this implementation because this implementation is not intended to be replaced (e.g. in tests).
 */
export class InMemoryEventBus {
  private multiChannelPubSub = new MultiChannelPubSub<Map<ConstructorOf<AnyEvent>, EventHandler<AnyEvent>>>();

  public subscribe<T extends AnyEvent>(Event: ConstructorOf<T>, handler: EventHandler<T>) {
    console.log(`Subscribing ${getOriginalConstructorName(handler)} to event ${Event.name}`);

    this.multiChannelPubSub.subscribe(Event, handler as EventHandler<AnyEvent>);

    return Promise.resolve();
  }

  public publish<T extends AnyEvent>(event: T): Promise<void> {
    console.log(`Publishing event ${getEventName(event)}`, toPrintableEvent(event));
    return this.multiChannelPubSub.publish(event.constructor as ConstructorOf<AnyEvent>, event);
  }
}
