import { describe, expect, it } from 'bun:test';

import { FakeUnitOfWork } from '../../tests/FakeUnitOfWork';
import { BatchObjectMother } from '../../tests/objectMothers/BatchObjectMother';
import { AddBatchUseCase } from '../AddBatchUseCase';

describe(AddBatchUseCase.name, () => {
  it('should add a batch', async () => {
    const unitOfWork = new FakeUnitOfWork();
    const inStockBatch = BatchObjectMother.default();

    await new AddBatchUseCase(unitOfWork).handle(inStockBatch);

    const productFromRepository = await unitOfWork.productRepository.get(inStockBatch.props.sku);
    const batchFromRepository = productFromRepository.props.batches[0];

    expect(batchFromRepository).toBeDefined();
    expect(unitOfWork.isCommitted).toBe(true);
  });
});
