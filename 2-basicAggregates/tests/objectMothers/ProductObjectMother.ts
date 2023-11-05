import { Product, ProductProperties } from '../../domain/Product';
import { UnprocessableInputError } from '../../shared/errors/UnprocessableInputError';
import { randomHash } from '../utils';
import { BatchObjectMother } from './BatchObjectMother';

export class ProductObjectMother {
  public static default(productProperties?: Partial<ProductProperties>) {
    const sku = productProperties?.sku || randomHash('SMALL-TABLE');
    const firstBatch =
      productProperties?.batches?.[0] ||
      BatchObjectMother.default({
        sku,
      });

    if (productProperties?.batches?.some((batch) => batch.props.sku !== sku)) {
      throw new UnprocessableInputError(`All product's batches must have the same sku as the product`);
    }

    return new Product({
      version: 1,
      sku,
      batches: productProperties?.batches?.length ? productProperties.batches : [firstBatch],
      ...productProperties,
    });
  }

  public static withManyBatches(productProperties?: Partial<ProductProperties>) {
    const sku = productProperties?.sku || randomHash('SMALL-TABLE');
    const batches = [
      BatchObjectMother.withAfterTomorrowsEta({
        sku,
      }),
      BatchObjectMother.default({
        sku,
      }),
      BatchObjectMother.withLatestEta({
        sku,
      }),
      BatchObjectMother.withTomorrowsEta({
        sku,
      }),
    ];

    return new Product({
      version: 1,
      sku,
      batches: batches,
      ...productProperties,
    });
  }
}
