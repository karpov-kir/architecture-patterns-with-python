import { TypeOrmUnitOfWork } from '../../infra/db/TypeOrmUnitOfWork';
import { AddOrderAllocationToReadModelEventHandler } from '../../infra/db/views/AddOrderAllocationToReadModelEventHandler';
import { RemoveAllocationFromReadModelEventHandler } from '../../infra/db/views/RemoveAllocationFromReadModelEventHandler';
import { JustLogEmailService } from '../../infra/JustLogEmailService';
import { InMemoryEventBus } from '../../infra/pubSub/InMemoryEventBus';
import { RedisEventBus } from '../../infra/RedisEventBus';
import { EmailServicePort } from '../../ports/EmailServicePort';
import { EventBusPort } from '../../ports/EventBusPort';
import { AnyEvent, EventHandler } from '../../shared/Event';
import { AddBatchUseCase } from '../../useCases/AddBatchUseCase';
import { AllocateUseCase } from '../../useCases/AllocateUseCase';
import { ChangeBatchQuantityUseCase } from '../../useCases/ChangeBatchQuantityUseCase';
import { SendOutOfStockEmailEventHandler } from '../../useCases/SendOutOfStockEmailEventHandler';
import { UnitOfWorkPort } from '../../useCases/UnitOfWork';
import { EventHandlers, subscribeToExternalEvents, subscribeToInternalEvents, UseCases } from './eventsMapping';

export interface EventBusCompositionRootDependencies {
  unitOfWorkFactory: () => Promise<UnitOfWorkPort>;
  internalEventBus: EventBusPort;
  externalEventBus: EventBusPort;
  emailService: EmailServicePort;
}

export class EventBusCompositionRoot {
  public readonly unitOfWorkFactory: () => Promise<UnitOfWorkPort>;
  public readonly internalEventBus: EventBusPort;
  public readonly externalEventBus: EventBusPort;
  public readonly emailService: EmailServicePort;

  public static async create(dependencies: Partial<EventBusCompositionRootDependencies> = {}) {
    const internalEventBus = dependencies.internalEventBus || new InMemoryEventBus();
    const externalEventBus = dependencies.externalEventBus || (await RedisEventBus.create());
    const unitOfWorkFactory = dependencies.unitOfWorkFactory || (() => TypeOrmUnitOfWork.create());
    const emailService = dependencies.emailService || new JustLogEmailService();

    return new EventBusCompositionRoot({ unitOfWorkFactory, internalEventBus, externalEventBus, emailService });
  }

  private constructor({
    unitOfWorkFactory,
    internalEventBus,
    externalEventBus,
    emailService,
  }: EventBusCompositionRootDependencies) {
    this.unitOfWorkFactory = unitOfWorkFactory;
    this.internalEventBus = internalEventBus;
    this.externalEventBus = externalEventBus;
    this.emailService = emailService;
  }

  public async start() {
    await this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    const useCases: UseCases = {
      changeBatchQuantityUseCase: new ChangeBatchQuantityUseCase(this.unitOfWorkFactory, this.internalEventBus),
      allocateUseCase: new AllocateUseCase(this.unitOfWorkFactory, this.internalEventBus),
      addBatchUseCase: new AddBatchUseCase(this.unitOfWorkFactory, this.internalEventBus),
    };

    const createTranslateEventToCommandEventHandler = <FromEvent extends AnyEvent, ToCommand extends AnyEvent>(
      translator: (event: FromEvent) => ToCommand,
    ) => new TranslateEventToCommandEventHandler<FromEvent, ToCommand>(this.internalEventBus, translator);

    const eventHandlers: EventHandlers = {
      sendOutOfStockEmailEventHandler: new SendOutOfStockEmailEventHandler(this.emailService),
      promoteToExternalAndPublishEventHandler: new PromoteToExternalAndPublishEventHandler(this.externalEventBus),
      addOrderAllocationToReadModelEventHandler: new AddOrderAllocationToReadModelEventHandler(),
      removeAllocationFromReadModelEventHandler: new RemoveAllocationFromReadModelEventHandler(),
      createTranslateEventToCommandEventHandler,
    };

    await Promise.all([
      subscribeToExternalEvents(this.externalEventBus, useCases),
      subscribeToInternalEvents(this.internalEventBus, useCases, eventHandlers),
    ]);
  }
}

const promotedToExternalSymbol = Symbol('promotedToExternal');

/**
 * It simply promotes and publishes an internal event to the outside world using the external event bus.
 */
export class PromoteToExternalAndPublishEventHandler {
  constructor(private readonly externalEventBus: EventBusPort) {}

  handle(event: AnyEvent): Promise<void> {
    event.meta[promotedToExternalSymbol] = true;
    return this.externalEventBus.publish(event);
  }
}

export class TranslateEventToCommandEventHandler<FromEvent extends AnyEvent, ToCommand extends AnyEvent>
  implements EventHandler<FromEvent>
{
  constructor(
    private readonly eventBus: EventBusPort,
    private readonly translator: (event: FromEvent) => ToCommand,
  ) {}

  public async handle(event: FromEvent): Promise<void> {
    await this.eventBus.publish(this.translator(event));
  }
}
