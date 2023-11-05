import { Batch, BatchProperties } from '../../domain/Batch';
import { randomHash } from '../utils';

export class BatchObjectMother {
  public static default(batchProperties?: Partial<BatchProperties>) {
    return new Batch({
      reference: randomHash('batch-001'),
      sku: 'SMALL-TABLE',
      purchasedQuantity: 20,
      allocatedOrderLines: [],
      eta: undefined,
      ...batchProperties,
    });
  }

  public static withTomorrowsEta(batchProperties?: Partial<BatchProperties>) {
    return this.default({
      ...batchProperties,
      eta: new Date(new Date().setDate(new Date().getDate() + 1)),
    });
  }

  public static withAfterTomorrowsEta(batchProperties?: Partial<BatchProperties>) {
    return this.default({
      ...batchProperties,
      eta: new Date(new Date().setDate(new Date().getDate() + 2)),
    });
  }

  public static withLatestEta(batchProperties?: Partial<BatchProperties>) {
    return this.default({
      ...batchProperties,
      eta: new Date(new Date().setDate(new Date().getDate() + 10)),
    });
  }
}
