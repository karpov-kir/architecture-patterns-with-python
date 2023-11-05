import clone from 'clone';

import { Batch, BatchProperties } from '../domain/Batch';
import { OrderLine } from '../domain/OrderLine';
import { NotFoundError } from '../shared/errors/NotFoundError';
import { BatchRepository } from '../useCases/UnitOfWork';

export class FakeBatchRepository implements BatchRepository {
  constructor(private readonly batchesProperties: BatchProperties[]) {}

  saveNew(batch: Batch): Promise<void> {
    this.batchesProperties.push(clone(batch.props) as BatchProperties);
    return Promise.resolve();
  }

  get(reference: string): Promise<Batch> {
    const batchProperties = this.batchesProperties.find((batchProperties) => batchProperties.reference === reference);

    return batchProperties
      ? Promise.resolve(new Batch(clone(batchProperties)))
      : Promise.reject(new NotFoundError('Batch is not found'));
  }

  list(): Promise<Batch[]> {
    return Promise.resolve(this.batchesProperties.map((batchProperties) => new Batch(clone(batchProperties))));
  }

  saveOrderLineAllocation(batch: Batch, orderLine: OrderLine): Promise<void> {
    const storedCopyOfBatchProperties = this.batchesProperties.find(
      (batchProperties) => batchProperties.reference === batch.props.reference,
    );

    if (!storedCopyOfBatchProperties) {
      throw new NotFoundError('Batch is not found');
    }

    storedCopyOfBatchProperties.allocatedOrderLines.add(orderLine);

    return Promise.resolve();
  }
}
