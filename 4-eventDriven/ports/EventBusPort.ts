import { AnyEvent, EventHandler } from '../shared/Event';
import { ConstructorOf } from '../types/ConstructorOf';

export interface EventBusPort {
  subscribe<T extends AnyEvent>(Event: ConstructorOf<T>, handler: EventHandler<T>): Promise<void>;
  publish<T extends AnyEvent>(event: T): Promise<void>;
  publishMany<T extends AnyEvent>(event: ReadonlyArray<T>): Promise<void>;
}
