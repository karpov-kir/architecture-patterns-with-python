import { describe, expect, it } from 'bun:test';

import { NotFoundError } from '../../shared/errors/NotFoundError';
import { FakeUnitOfWork } from '../../tests/FakeUnitOfWork';
import { OrderLineObjectMother } from '../../tests/objectMothers/LineOrderObjectMother';
import { ProductObjectMother } from '../../tests/objectMothers/ProductObjectMother';
import { randomHash } from '../../tests/utils';
import { AllocateUseCase } from '../AllocateUseCase';

describe(AllocateUseCase.name, () => {
  it('should return allocation', async () => {
    const unitOfWork = new FakeUnitOfWork();
    const sku = randomHash('SMALL-TABLE');
    const inStockProduct = ProductObjectMother.default({ sku });
    const inStockBatch = inStockProduct.props.batches[0];

    await unitOfWork.productRepository.save(inStockProduct);

    const allocatedToBatchReference = await new AllocateUseCase(unitOfWork).handle(
      OrderLineObjectMother.default({ sku }),
    );

    expect(allocatedToBatchReference).toBe(inStockBatch.props.reference);
    expect(unitOfWork.isCommitted).toBe(true);
  });

  it('should throw a non existent sku error', async () => {
    const unitOfWork = new FakeUnitOfWork();
    let caughtError: unknown;

    await unitOfWork.productRepository.save(ProductObjectMother.default());

    try {
      await new AllocateUseCase(unitOfWork).handle(
        OrderLineObjectMother.default({
          sku: 'NON-EXISTING',
        }),
      );
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toEqual(
      new NotFoundError('Cannot allocate order line to product: no product with this SKU exists'),
    );
  });
});
