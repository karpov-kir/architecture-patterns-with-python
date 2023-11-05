import clone from 'clone';

import { Product, ProductProperties } from '../domain/Product';
import { NotFoundError } from '../shared/errors/NotFoundError';
import { ProductRepository } from '../useCases/UnitOfWork';

export class FakeProductRepository implements ProductRepository {
  public readonly seen: Product[] = [];

  private addToSeenAndReturn(product: Product): Product {
    this.seen.push(product);

    return product;
  }

  constructor(private readonly propertiesOfProducts: ProductProperties[]) {}

  save(product: Product): Promise<void> {
    const existingProductIndex = this.propertiesOfProducts.findIndex(
      (productProperties) => productProperties.sku === product.props.sku,
    );

    if (existingProductIndex !== -1) {
      this.propertiesOfProducts.splice(existingProductIndex, 1);
    }

    const newProductProperties = clone(product.props) as ProductProperties;

    this.propertiesOfProducts.push(newProductProperties);

    return Promise.resolve();
  }

  get(sku: string): Promise<Product> {
    const productProperties = this.propertiesOfProducts.find((productProperties) => productProperties.sku === sku);

    return productProperties
      ? Promise.resolve(this.addToSeenAndReturn(new Product(clone(productProperties))))
      : Promise.reject(new NotFoundError('Product is not found'));
  }

  find(sku: string): Promise<Product | undefined> {
    const productProperties = this.propertiesOfProducts.find((productProperties) => productProperties.sku === sku);

    return productProperties
      ? Promise.resolve(this.addToSeenAndReturn(new Product(clone(productProperties))))
      : Promise.resolve(undefined);
  }

  getByBatchReference(batchReference: string): Promise<Product> {
    for (const productProperties of this.propertiesOfProducts) {
      for (const batch of productProperties.batches) {
        if (batch.props.reference === batchReference) {
          return Promise.resolve(this.addToSeenAndReturn(new Product(clone(productProperties))));
        }
      }
    }

    return Promise.reject(new NotFoundError('Product is not found'));
  }
}
