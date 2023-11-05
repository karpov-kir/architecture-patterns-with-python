import { BatchRepository, UnitOfWork } from '../../useCases/UnitOfWork';
import { KnexBatchRepository } from './KnexBatchRepository';
import { KnexSession } from './KnexSession';

export class KnexUnitOfWork implements UnitOfWork {
  private constructor(
    public session: KnexSession,
    public batchRepository: BatchRepository,
  ) {}

  public static async create(): Promise<KnexUnitOfWork> {
    const session = await KnexSession.create();
    const batchRepository = new KnexBatchRepository(session);

    return new KnexUnitOfWork(session, batchRepository);
  }

  public async commit(): Promise<void> {
    await this.session.commit();
  }

  public async rollback(): Promise<void> {
    await this.session.rollback();
  }
}
