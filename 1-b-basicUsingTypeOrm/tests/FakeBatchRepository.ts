import clone from 'clone';

import { Batch, BatchProperties } from '../domain/Batch';
import { NotFoundError } from '../shared/errors/NotFoundError';
import { BatchRepository } from '../useCases/UnitOfWork';

export class FakeBatchRepository implements BatchRepository {
  constructor(private readonly batchesProperties: BatchProperties[]) {}

  save(batch: Batch): Promise<void> {
    const existingBatchPropertiesIndex = this.batchesProperties.findIndex(
      (batchProperties) => batchProperties.reference === batch.props.reference,
    );

    if (existingBatchPropertiesIndex !== -1) {
      this.batchesProperties.splice(existingBatchPropertiesIndex, 1);
    }

    const newBatchProperties = clone(batch.props) as BatchProperties;

    this.batchesProperties.push(newBatchProperties);

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
}
