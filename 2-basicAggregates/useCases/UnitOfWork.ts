import { Product } from '../domain/Product';

export interface UnitOfWork {
  productRepository: ProductRepository;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface ProductRepository {
  save(product: Product): Promise<void>;
  find(sku: string): Promise<Product | undefined>;
  get(sku: string): Promise<Product>;
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
