import { ProductRepository, UnitOfWork } from '../../useCases/UnitOfWork';
import { TypeOrmProductsRepository } from './TypeOrmProductsRepository';
import { TypeOrmSession } from './TypeOrmSession';

export class TypeOrmUnitOfWork implements UnitOfWork {
  private constructor(
    public session: TypeOrmSession,
    public productRepository: ProductRepository,
  ) {}

  public static async create(): Promise<TypeOrmUnitOfWork> {
    const session = await TypeOrmSession.create();
    const productRepository = new TypeOrmProductsRepository(session);

    return new TypeOrmUnitOfWork(session, productRepository);
  }

  public async commit(): Promise<void> {
    if (!this.session.isTransactionActive) {
      return;
    }

    await this.session.commit();
  }

  public async rollback(): Promise<void> {
    if (!this.session.isTransactionActive) {
      return;
    }

    await this.session.rollback();
  }
}
