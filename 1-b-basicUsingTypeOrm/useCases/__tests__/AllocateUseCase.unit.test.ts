import { describe, expect, it } from 'bun:test';

import { NotFoundError } from '../../shared/errors/NotFoundError';
import { FakeUnitOfWork } from '../../tests/FakeUnitOfWork';
import { BatchObjectMother } from '../../tests/objectMothers/BatchObjectMother';
import { OrderLineObjectMother } from '../../tests/objectMothers/LineOrderObjectMother';
import { AllocateUseCase } from '../AllocateUseCase';

describe(AllocateUseCase.name, () => {
  it('should return allocation', async () => {
    const unitOfWork = new FakeUnitOfWork();
    const inStockBatch = BatchObjectMother.default();

    await unitOfWork.batchRepository.save(inStockBatch);

    const allocatedToBatchReference = await new AllocateUseCase(unitOfWork).handle(OrderLineObjectMother.default());

    expect(allocatedToBatchReference).toBe(inStockBatch.props.reference);
    expect(unitOfWork.isCommitted).toBe(true);
  });

  it('should throw a non existent sku error', async () => {
    const unitOfWork = new FakeUnitOfWork();
    let caughtError: unknown;

    await unitOfWork.batchRepository.save(BatchObjectMother.default());

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
      new NotFoundError('Cannot allocate an order line to a batch: no batch with this SKU exists'),
    );
  });
});
