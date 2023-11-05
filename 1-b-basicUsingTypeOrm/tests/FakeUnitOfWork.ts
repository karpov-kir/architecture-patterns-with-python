import { UnitOfWork } from '../useCases/UnitOfWork';
import { FakeBatchRepository } from './FakeBatchRepository';

export class FakeUnitOfWork implements UnitOfWork {
  public batchRepository = new FakeBatchRepository([]);

  public isCommitted: boolean = false;

  public async commit(): Promise<void> {
    this.isCommitted = true;
  }

  public async rollback(): Promise<void> {}
}
