import { AnyEvent } from '../../shared/Event';
import { ProductRepository, UnitOfWorkPort } from '../../useCases/UnitOfWork';
import { TypeOrmProductsRepository } from './TypeOrmProductsRepository';
import { TypeOrmSession } from './TypeOrmSession';

export class TypeOrmUnitOfWork implements UnitOfWorkPort {
  private constructor(
    public session: TypeOrmSession,
    public productRepository: ProductRepository,
  ) {}

  public static async create(): Promise<TypeOrmUnitOfWork> {
    const session = await TypeOrmSession.create();
    const productRepository = new TypeOrmProductsRepository(session);

    return new TypeOrmUnitOfWork(session, productRepository);
  }

  public collectNewEvents() {
    const events: AnyEvent[] = [];

    for (const product of this.productRepository.seen) {
      for (const event of product.events) {
        events.push(event);
      }
    }

    return events;
  }

  public async commit(): Promise<void> {
    if (this.session.isTransactionActive) {
      await this.session.commit();
    }
  }

  public async rollback(): Promise<void> {
    if (!this.session.isTransactionActive) {
      return;
    }

    await this.session.rollback();
  }
}
