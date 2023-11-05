import { ProductRepository, UnitOfWorkPort } from '../useCases/UnitOfWork';
import { TypeOrmProductsRepository } from './db/TypeOrmProductsRepository';
import { TypeOrmSession } from './db/TypeOrmSession';
import { InMemoryEventBus } from './pubSub/InMemoryEventBus';

/**
 * This unit of work is now placed outside of the `db` folder, because it uses the database and the event bus.
 */
export class TypeOrmUnitOfWork implements UnitOfWorkPort {
  private constructor(
    public session: TypeOrmSession,
    public productRepository: ProductRepository,
    private eventBus: InMemoryEventBus,
  ) {}

  public static async create(eventBus: InMemoryEventBus): Promise<TypeOrmUnitOfWork> {
    const session = await TypeOrmSession.create();
    const productRepository = new TypeOrmProductsRepository(session);

    return new TypeOrmUnitOfWork(session, productRepository, eventBus);
  }

  private async publishEvents() {
    for (const product of this.productRepository.seen) {
      for (const event of product.events) {
        await this.eventBus.publish(event);
      }
    }
  }

  public async commit(): Promise<void> {
    if (this.session.isTransactionActive) {
      await this.session.commit();
    }

    await this.publishEvents();
  }

  public async rollback(): Promise<void> {
    if (!this.session.isTransactionActive) {
      return;
    }

    await this.session.rollback();
  }
}
