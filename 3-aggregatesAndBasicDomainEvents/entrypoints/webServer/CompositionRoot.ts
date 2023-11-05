import { OutOfStockEvent } from '../../domain/events/OutOfStockEvent';
import { JustLogEmailService } from '../../infra/JustLogEmailService';
import { InMemoryEventBus } from '../../infra/pubSub/InMemoryEventBus';
import { TypeOrmUnitOfWork } from '../../infra/TypeOrmUnitOfWork';
import { EmailServicePort } from '../../ports/EmailServicePort';
import { AnyEvent, EventHandler, LogDecorator, NotFailDecorator, RunInBackgroundDecorator } from '../../shared/Event';
import { ConstructorOf } from '../../types/ConstructorOf';
import { SendOutOfStockEmailEventHandler } from '../../useCases/SendOutOfStockEmailEventHandler';
import { UnitOfWorkPort } from '../../useCases/UnitOfWork';
import { addDecorators } from '../../utils';
import { AddBatchController } from './controllers/AddBatchController';
import { AllocateController } from './controllers/AllocateController';
import { WebServer } from './WebServer';

interface Dependencies {
  unitOfWorkFactory: () => Promise<UnitOfWorkPort>;
  emailService: EmailServicePort;
  eventBus: InMemoryEventBus;
}

export class CompositionRoot {
  public readonly unitOfWorkFactory: () => Promise<UnitOfWorkPort>;
  public readonly emailService: EmailServicePort;
  public readonly webServer: WebServer;
  public readonly eventBus: InMemoryEventBus;

  public static async create(dependencies: Partial<Dependencies> = {}) {
    const eventBus = dependencies.eventBus || new InMemoryEventBus();
    const unitOfWorkFactory = dependencies.unitOfWorkFactory || (() => TypeOrmUnitOfWork.create(eventBus));
    const emailService = dependencies.emailService || new JustLogEmailService();

    return new CompositionRoot({ unitOfWorkFactory, emailService, eventBus });
  }

  public async start() {
    await this.webServer.start();
  }

  private constructor({ unitOfWorkFactory, emailService, eventBus }: Dependencies) {
    this.unitOfWorkFactory = unitOfWorkFactory;
    this.emailService = emailService;
    this.webServer = this.createWebServer();
    this.eventBus = eventBus;

    this.subscribeToEvents();
  }

  private createWebServer() {
    return new WebServer({
      addBatchController: new AddBatchController(this.unitOfWorkFactory),
      allocateController: new AllocateController(this.unitOfWorkFactory),
    });
  }

  private subscribeToEvents() {
    const mapping: Array<[ConstructorOf<AnyEvent>, EventHandler<AnyEvent>]> = [
      [OutOfStockEvent, new SendOutOfStockEmailEventHandler(this.emailService)],
    ];

    for (const [Event, handler] of mapping) {
      this.eventBus.subscribe(
        Event,
        addDecorators(handler, [LogDecorator, NotFailDecorator, RunInBackgroundDecorator]),
      );
    }
  }
}
