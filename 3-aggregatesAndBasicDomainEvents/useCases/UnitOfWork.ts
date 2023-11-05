import { Product } from '../domain/Product';

export interface UnitOfWorkPort {
  productRepository: ProductRepository;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export interface ProductRepository {
  save(product: Product): Promise<void>;
  find(sku: string): Promise<Product | undefined>;
  get(sku: string): Promise<Product>;
  seen: Product[];
}

export abstract class UseCaseWithUnitOfWork<Arguments extends Array<unknown>, Return> {
  constructor(protected readonly unitOfWork: UnitOfWorkPort) {
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
