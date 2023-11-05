import { Batch } from '../domain/Batch';
import { OrderLine } from '../domain/OrderLine';

export interface UnitOfWork {
  batchRepository: BatchRepository;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface BatchRepository {
  saveNew(batch: Batch): Promise<void>;
  get(reference: string): Promise<Batch>;
  list(): Promise<Batch[]>;
  saveOrderLineAllocation(batch: Batch, orderLine: OrderLine): Promise<void>;
}

export abstract class UseCaseWithUnitOfWork<T> {
  constructor(protected readonly unitOfWork: UnitOfWork) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract execute(...args: any): Promise<T>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async handle(...args: any) {
    try {
      const result = await this.execute(...args);
      return result;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}
