import { TypeOrmUnitOfWork } from '../../infra/db/TypeOrmUnitOfWork';
import { InMemoryEventBus } from '../../infra/pubSub/InMemoryEventBus';
import { EventBusPort } from '../../ports/EventBusPort';
import { UnitOfWorkPort } from '../../useCases/UnitOfWork';
import { AddBatchController } from './controllers/AddBatchController';
import { AllocateController } from './controllers/AllocateController';
import { GetOrderAllocationsController } from './controllers/GetOrderAllocationsController';
import { WebServer } from './WebServer';

export interface WebServerCompositionRootDependencies {
  unitOfWorkFactory: () => Promise<UnitOfWorkPort>;
  internalEventBus: EventBusPort;
}

export class WebServerCompositionRoot {
  public readonly unitOfWorkFactory: () => Promise<UnitOfWorkPort>;
  public readonly webServer: WebServer;
  public readonly internalEventBus: EventBusPort;

  public static async create(dependencies: Partial<WebServerCompositionRootDependencies> = {}) {
    const internalEventBus = dependencies.internalEventBus || new InMemoryEventBus();
    const unitOfWorkFactory = dependencies.unitOfWorkFactory || (() => TypeOrmUnitOfWork.create());

    return new WebServerCompositionRoot({ unitOfWorkFactory, internalEventBus });
  }

  private constructor({ unitOfWorkFactory, internalEventBus }: WebServerCompositionRootDependencies) {
    this.internalEventBus = internalEventBus;
    this.unitOfWorkFactory = unitOfWorkFactory;

    this.webServer = this.createWebServer();
  }

  public async start() {
    this.webServer.start();
  }

  private createWebServer() {
    return new WebServer({
      addBatchController: new AddBatchController(this.internalEventBus),
      allocateController: new AllocateController(this.internalEventBus),
      getOrderAllocationsController: new GetOrderAllocationsController(),
    });
  }
}
