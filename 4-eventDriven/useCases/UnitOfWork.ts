import { Product } from '../domain/Product';
import { EventBusPort } from '../ports/EventBusPort';
import { AnyEvent, EventHandler } from '../shared/Event';

export interface UnitOfWorkPort {
  productRepository: ProductRepository;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  collectNewEvents: () => AnyEvent[];
}

export interface ProductRepository {
  save(product: Product): Promise<void>;
  find(sku: string): Promise<Product | undefined>;
  get(sku: string): Promise<Product>;
  getByBatchReference(batchReference: string): Promise<Product>;
  seen: Product[];
}

export abstract class CommandHandlerUseCase<T extends AnyEvent> implements EventHandler<T> {
  constructor(
    protected readonly unitOfWorkFactory: () => Promise<UnitOfWorkPort>,
    protected readonly internalEventBus: EventBusPort,
  ) {}

  #unitOfWork?: UnitOfWorkPort;

  protected get unitOfWork(): UnitOfWorkPort {
    if (!this.#unitOfWork) {
      throw new Error('UnitOfWork is not initialized');
    }

    return this.#unitOfWork;
  }

  protected abstract execute(command: T): Promise<void>;

  public async handle(command: T): Promise<void> {
    this.#unitOfWork = await this.unitOfWorkFactory();

    try {
      await this.execute(command);
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }

  public async commitAndPublishEvents(): Promise<void> {
    await this.unitOfWork.commit();
    await this.internalEventBus.publishMany(this.unitOfWork.collectNewEvents());
  }
}
