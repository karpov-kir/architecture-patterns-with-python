import { describe, expect, it } from 'bun:test';

import { NotFoundError } from '../../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../../shared/errors/UnprocessableInputError';
import { BatchObjectMother } from '../../tests/objectMothers/BatchObjectMother';
import { OrderLineObjectMother } from '../../tests/objectMothers/LineOrderObjectMother';
import { ProductObjectMother } from '../../tests/objectMothers/ProductObjectMother';
import { randomHash } from '../../tests/utils';
import { Product } from '../Product';

describe(Product.name, () => {
  it('should prefer the current stock batches to shipment', () => {
    const sku = randomHash('SMALL-TABLE');
    const inStockBatch = BatchObjectMother.default({ sku });
    const shipmentBatch = BatchObjectMother.withTomorrowsEta({ sku });
    const product = ProductObjectMother.default({
      sku,
      batches: [inStockBatch, shipmentBatch],
    });

    product.allocate(OrderLineObjectMother.default({ sku }));

    expect(inStockBatch.availableQuantity).toBe(15);
    expect(shipmentBatch.availableQuantity).toBe(20);
  });

  it('should prefer earlier batches', () => {
    const sku = randomHash('SMALL-TABLE');
    const earliest = BatchObjectMother.withTomorrowsEta({ sku });
    const medium = BatchObjectMother.withAfterTomorrowsEta({ sku });
    const latest = BatchObjectMother.withLatestEta({ sku });
    const product = ProductObjectMother.default({
      sku,
      batches: [medium, earliest, latest],
    });

    product.allocate(OrderLineObjectMother.default({ sku }));

    expect(earliest.availableQuantity).toBe(15);
    expect(medium.availableQuantity).toBe(20);
    expect(latest.availableQuantity).toBe(20);
  });

  it('should return allocated batch', () => {
    const sku = randomHash('SMALL-TABLE');
    const inStockProduct = ProductObjectMother.default({ sku });
    const inStockBatch = inStockProduct.props.batches[0];

    const allocatedToBatch = inStockProduct.allocate(OrderLineObjectMother.default({ sku }));

    expect(allocatedToBatch.props).toEqual(inStockBatch.props);
  });

  it('should throw an out of stock exception if cannot allocate', () => {
    const sku = randomHash('SMALL-TABLE');
    const inStockProduct = ProductObjectMother.default({ sku });
    const inStockBatch = inStockProduct.props.batches[0];

    expect(() =>
      inStockProduct.allocate(
        OrderLineObjectMother.default({
          sku,
          quantity: inStockBatch.props.purchasedQuantity + 1,
        }),
      ),
    ).toThrow(new UnprocessableInputError('Cannot allocate order line to batch: out of stock'));
  });

  it('should throw an invalid SKU exception when allocating if the SKU is not found', () => {
    const inStockProduct = ProductObjectMother.default();

    expect(() =>
      inStockProduct.allocate(
        OrderLineObjectMother.default({
          sku: 'NON-EXISTING',
        }),
      ),
    ).toThrow(new NotFoundError('Invalid SKU NON-EXISTING'));
  });

  it('should throw an exception when adding a batch if the batch has a different SKU', () => {
    const product = ProductObjectMother.default();

    expect(() =>
      product.addBatch(
        BatchObjectMother.default({
          sku: 'DIFFERENT',
        }),
      ),
    ).toThrow(new UnprocessableInputError("All product's batches must have the same sku as the product"));
  });
});
