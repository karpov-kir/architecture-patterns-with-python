import { AddBatchCommand } from '../../domain/commands/AddBatchCommand';
import { AllocateCommand } from '../../domain/commands/AllocateCommand';
import { ChangeBatchQuantityCommand } from '../../domain/commands/ChangeBatchQuantityCommand';
import { AllocatedEvent } from '../../domain/events/AllocatedEvent';
import { DeallocatedEvent } from '../../domain/events/DeallocatedEvent';
import { OutOfStockEvent } from '../../domain/events/OutOfStockEvent';
import { AddOrderAllocationToReadModelEventHandler } from '../../infra/db/views/AddOrderAllocationToReadModelEventHandler';
import { RemoveAllocationFromReadModelEventHandler } from '../../infra/db/views/RemoveAllocationFromReadModelEventHandler';
import { EventBusPort } from '../../ports/EventBusPort';
import {
  AnyEvent,
  EventHandler,
  LogDecorator,
  NotFailDecorator,
  RetryDecorator,
  RunInBackgroundDecorator,
} from '../../shared/Event';
import { ConstructorOf } from '../../types/ConstructorOf';
import { AddBatchUseCase } from '../../useCases/AddBatchUseCase';
import { AllocateUseCase } from '../../useCases/AllocateUseCase';
import { ChangeBatchQuantityUseCase } from '../../useCases/ChangeBatchQuantityUseCase';
import { SendOutOfStockEmailEventHandler } from '../../useCases/SendOutOfStockEmailEventHandler';
import { addDecorators, Decorator } from '../../utils';
import {
  PromoteToExternalAndPublishEventHandler,
  TranslateEventToCommandEventHandler,
} from './EventBusCompositionRoot';

export interface UseCases {
  changeBatchQuantityUseCase: ChangeBatchQuantityUseCase;
  allocateUseCase: AllocateUseCase;
  addBatchUseCase: AddBatchUseCase;
}

export interface EventHandlers {
  sendOutOfStockEmailEventHandler: SendOutOfStockEmailEventHandler;
  promoteToExternalAndPublishEventHandler: PromoteToExternalAndPublishEventHandler;
  addOrderAllocationToReadModelEventHandler: AddOrderAllocationToReadModelEventHandler;
  removeAllocationFromReadModelEventHandler: RemoveAllocationFromReadModelEventHandler;
  createTranslateEventToCommandEventHandler: <FromEvent extends AnyEvent, ToCommand extends AnyEvent>(
    translator: (event: FromEvent) => ToCommand,
  ) => TranslateEventToCommandEventHandler<FromEvent, ToCommand>;
}

export const subscribeToExternalEvents = async (externalEventBus: EventBusPort, useCases: UseCases) => {
  /**
   * Use cases are exposed via external event bus commands. It's useful because it:
   * - Improves testability
   * - Allows the use cases to be invoked by external systems without having to call the web server
   *   - This enables services to follow temporal decoupling (e.g. a fire and forget strategy)
   */
  const externalCommandsMapping: Array<[ConstructorOf<AnyEvent>, EventHandler<AnyEvent>]> = [
    [ChangeBatchQuantityCommand, useCases.changeBatchQuantityUseCase],
  ];

  await subscribeToEvents(
    externalEventBus,
    externalCommandsMapping,
    // Re. used decorators. Commands execute business logic, but since they are invoked externally and we want to have temporal decoupling,
    // the external services should just fire a command to be executed and forget, and we should try our best to execute the command.
    // This is why `RetryDecorator`, `NotFailDecorator`, and `RunInBackgroundDecorator` are used.
    // If a command cannot be executed it should be reported somewhere (e.g. a monitoring system or a dead letter queue) and investigated.
    [LogDecorator, RetryDecorator, NotFailDecorator, RunInBackgroundDecorator],
  );
};

export const subscribeToInternalEvents = async (
  internalEventBus: EventBusPort,
  useCases: UseCases,
  eventHandlers: EventHandlers,
) => {
  /**
   * Use cases are exposed via an internal event bus commands. It's useful because it:
   * - Improves testability
   * - Allows the use cases to be easily mounted to the web server routes (routes just emit internal commands)
   * - Makes use cases simple command handlers
   */
  const internalCommandsMapping: Array<[ConstructorOf<AnyEvent>, EventHandler<AnyEvent>]> = [
    [AddBatchCommand, useCases.addBatchUseCase],
    [AllocateCommand, useCases.allocateUseCase],
  ];

  /**
   * Event handlers are subscribed to internal events. It's useful because it:
   * - Improves testability
   * - Allows to move side effects to event handlers from the core business logic
   */
  const importantInternalEventsMapping: Array<[ConstructorOf<AnyEvent>, EventHandler<AnyEvent>]> = [
    [AllocatedEvent, eventHandlers.addOrderAllocationToReadModelEventHandler],
    [DeallocatedEvent, eventHandlers.removeAllocationFromReadModelEventHandler],
    [
      DeallocatedEvent,
      eventHandlers.createTranslateEventToCommandEventHandler(
        (event: DeallocatedEvent) =>
          new AllocateCommand({
            orderId: event.props.orderId,
            sku: event.props.sku,
            quantity: event.props.quantity,
          }),
      ),
    ],
  ];
  const internalEventsMapping: Array<[ConstructorOf<AnyEvent>, EventHandler<AnyEvent>]> = [
    [OutOfStockEvent, eventHandlers.sendOutOfStockEmailEventHandler],
    [AllocatedEvent, eventHandlers.promoteToExternalAndPublishEventHandler],
  ];

  await Promise.all([
    subscribeToEvents(
      internalEventBus,
      internalCommandsMapping,
      // Re. used decorators. Commands execute business logic, but since they are invoked internally we want them to fail
      // and propagate the error to the caller, that's why `NotFailDecorator` and `RunInBackgroundDecorator` are NOT used.
      [LogDecorator],
    ),

    subscribeToEvents(
      internalEventBus,
      importantInternalEventsMapping,
      // Re. used decorators. Even important events should not break the main execution flow,
      // but we still want to await them, to ensure they take effect before the flow is finished,
      // that's why `NotFailDecorator` is used and `RunInBackgroundDecorator` is NOT used.
      [LogDecorator, NotFailDecorator],
    ),

    subscribeToEvents(
      internalEventBus,
      internalEventsMapping,
      // Re. used decorators. We don't want some event handlers to block or break the main execution flow,
      // that's why `NotFailDecorator` and `RunInBackgroundDecorator` are used.
      [LogDecorator, NotFailDecorator, RunInBackgroundDecorator],
    ),
  ]);
};

const subscribeToEvents = async (
  eventBus: EventBusPort,
  eventsMapping: Array<[ConstructorOf<AnyEvent>, EventHandler<AnyEvent>]>,
  decorators: Decorator[],
) => {
  for (const [Event, handler] of eventsMapping) {
    await eventBus.subscribe(Event, addDecorators(handler, decorators));
  }
};
