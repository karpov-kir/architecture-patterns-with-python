import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { Batch } from './Batch';
import { OrderLine } from './OrderLine';

export class BatchDomainService {
  public static allocate(orderLine: OrderLine, batches: Batch[]) {
    let allocatedToBatch: Batch | undefined;
    let hasBatchWithSku = false;

    for (const batch of batches.sort((a, b) => (a.greaterThan(b) ? 1 : -1))) {
      if (batch.props.sku === orderLine.props.sku) {
        hasBatchWithSku = true;
      }

      try {
        batch.allocate(orderLine);
        allocatedToBatch = batch;
        break;
      } catch (error) {}
    }

    if (!allocatedToBatch) {
      if (hasBatchWithSku) {
        throw new UnprocessableInputError('Cannot allocate an order line to a batch: out of stock');
      }

      throw new UnprocessableInputError(`Invalid SKU ${orderLine.props.sku}`);
    }

    return allocatedToBatch;
  }
}
