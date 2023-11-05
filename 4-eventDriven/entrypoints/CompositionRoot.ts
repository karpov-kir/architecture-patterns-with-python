import { TypeOrmUnitOfWork } from '../infra/db/TypeOrmUnitOfWork';
import { JustLogEmailService } from '../infra/JustLogEmailService';
import { InMemoryEventBus } from '../infra/pubSub/InMemoryEventBus';
import { RedisEventBus } from '../infra/RedisEventBus';
import { EventBusCompositionRoot, EventBusCompositionRootDependencies } from './eventBus/EventBusCompositionRoot';
import { WebServerCompositionRoot, WebServerCompositionRootDependencies } from './webServer/WebServerCompositionRoot';

export interface CompositionRootDependencies
  extends EventBusCompositionRootDependencies,
    WebServerCompositionRootDependencies {}

interface ChildrenCompositionRoots {
  webServerCompositionRoot: WebServerCompositionRoot;
  eventBusCompositionRoot: EventBusCompositionRoot;
}

export class CompositionRoot {
  public readonly webServerCompositionRoot: WebServerCompositionRoot;
  public readonly eventBusCompositionRoot: EventBusCompositionRoot;

  public static async create(dependencies: Partial<CompositionRootDependencies> = {}) {
    const internalEventBus = dependencies.internalEventBus || new InMemoryEventBus();
    const externalEventBus = dependencies.externalEventBus || (await RedisEventBus.create());
    const unitOfWorkFactory = dependencies.unitOfWorkFactory || (() => TypeOrmUnitOfWork.create());
    const emailService = dependencies.emailService || new JustLogEmailService();

    const finalDependencies: CompositionRootDependencies = {
      internalEventBus,
      externalEventBus,
      unitOfWorkFactory,
      emailService,
    };

    const eventBusCompositionRoot = await EventBusCompositionRoot.create(finalDependencies);
    const webServerCompositionRoot = await WebServerCompositionRoot.create(finalDependencies);

    return new CompositionRoot({ webServerCompositionRoot, eventBusCompositionRoot });
  }

  private constructor({ webServerCompositionRoot, eventBusCompositionRoot }: ChildrenCompositionRoots) {
    this.webServerCompositionRoot = webServerCompositionRoot;
    this.eventBusCompositionRoot = eventBusCompositionRoot;
  }

  public async start() {
    await Promise.all([this.webServerCompositionRoot.start(), this.eventBusCompositionRoot.start()]);
  }
}
