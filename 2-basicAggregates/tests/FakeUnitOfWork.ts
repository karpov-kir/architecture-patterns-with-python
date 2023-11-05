import { UnitOfWork } from '../useCases/UnitOfWork';
import { FakeProductRepository } from './FakeProductRepository';

export class FakeUnitOfWork implements UnitOfWork {
  public productRepository = new FakeProductRepository([]);

  public isCommitted: boolean = false;

  public async commit(): Promise<void> {
    this.isCommitted = true;
  }

  public async rollback(): Promise<void> {}
}
