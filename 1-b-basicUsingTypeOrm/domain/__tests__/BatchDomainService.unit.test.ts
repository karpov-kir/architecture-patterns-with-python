import { describe, expect, it } from 'bun:test';

import { NotFoundError } from '../../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../../shared/errors/UnprocessableInputError';
import { BatchObjectMother } from '../../tests/objectMothers/BatchObjectMother';
import { OrderLineObjectMother } from '../../tests/objectMothers/LineOrderObjectMother';
import { BatchDomainService } from '../BatchDomainService';

describe(BatchDomainService.name, () => {
  it('should prefer the current stock batches to shipment', () => {
    const inStockBatch = BatchObjectMother.default();
    const shipmentBatch = BatchObjectMother.withTomorrowsEta();

    BatchDomainService.allocate(OrderLineObjectMother.default(), [inStockBatch, shipmentBatch]);

    expect(inStockBatch.availableQuantity).toBe(15);
    expect(shipmentBatch.availableQuantity).toBe(20);
  });

  it('should prefer earlier batches', () => {
    const earliest = BatchObjectMother.withTomorrowsEta();
    const medium = BatchObjectMother.withAfterTomorrowsEta();
    const latest = BatchObjectMother.withLatestEta();

    BatchDomainService.allocate(OrderLineObjectMother.default(), [medium, earliest, latest]);

    expect(earliest.availableQuantity).toBe(15);
    expect(medium.availableQuantity).toBe(20);
    expect(latest.availableQuantity).toBe(20);
  });

  it('should return allocated batch', () => {
    const inStockBatch = BatchObjectMother.default();

    const allocatedToBatch = BatchDomainService.allocate(OrderLineObjectMother.default(), [inStockBatch]);

    expect(allocatedToBatch.props).toEqual(inStockBatch.props);
  });

  it('should throw an out of stock exception if cannot allocate', () => {
    const inStockBatch = BatchObjectMother.default();

    expect(() =>
      BatchDomainService.allocate(
        OrderLineObjectMother.default({
          quantity: inStockBatch.availableQuantity + 1,
        }),
        [inStockBatch],
      ),
    ).toThrow(new UnprocessableInputError('Cannot allocate an order line to a batch: out of stock'));
  });

  it('should throw an invalid SKU exception if the SKU is not found', () => {
    const inStockBatch = BatchObjectMother.default();

    expect(() =>
      BatchDomainService.allocate(
        OrderLineObjectMother.default({
          sku: 'NON-EXISTING',
        }),
        [inStockBatch],
      ),
    ).toThrow(new NotFoundError('Invalid SKU NON-EXISTING'));
  });
});
