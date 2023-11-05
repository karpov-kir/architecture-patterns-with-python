import { BatchRepository, UnitOfWork } from '../../useCases/UnitOfWork';
import { TypeOrmBatchRepository } from './TypeOrmBatchRepository';
import { TypeOrmSession } from './TypeOrmSession';

export class TypeOrmUnitOfWork implements UnitOfWork {
  private constructor(
    public session: TypeOrmSession,
    public batchRepository: BatchRepository,
  ) {}

  public static async create(): Promise<TypeOrmUnitOfWork> {
    const session = await TypeOrmSession.create();
    const batchRepository = new TypeOrmBatchRepository(session);

    return new TypeOrmUnitOfWork(session, batchRepository);
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
