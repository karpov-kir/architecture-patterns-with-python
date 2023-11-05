import { Batch } from '../domain/Batch';

export interface UnitOfWork {
  batchRepository: BatchRepository;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface BatchRepository {
  save(batch: Batch): Promise<void>;
  get(reference: string): Promise<Batch>;
  list(): Promise<Batch[]>;
}

export abstract class UseCaseWithUnitOfWork<Arguments extends Array<unknown>, Return> {
  constructor(protected readonly unitOfWork: UnitOfWork) {
    return this;
  }

  protected abstract execute(...args: Arguments): Promise<Return>;

  public async handle(...args: Arguments): Promise<Return> {
    try {
      const result = await this.execute(...args);
      return result;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}
