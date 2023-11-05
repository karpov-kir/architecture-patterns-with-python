import { describe, expect, it } from 'bun:test';

import { NotFoundError } from '../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { Batch } from './Batch';
import { OrderLine } from './OrderLine';

describe(Batch.name, () => {
  describe('allocation', () => {
    it('should reduce the available quantity when allocating an order line to a batch', () => {
      const [batch, orderLine] = createBatchAndOrderLines();

      batch.allocate(orderLine);

      expect(batch.availableQuantity).toEqual(19);
    });

    it('should reduce the available quantity when allocating multiple order lines to a batch', () => {
      const [batch, ...orderLines] = createBatchAndOrderLines();

      orderLines.forEach((orderLine) => batch.allocate(orderLine));

      expect(batch.availableQuantity).toEqual(14);
    });

    it('should throw an error if the batch does not have enough quantity when allocating an order line', () => {
      const [batch] = createBatchAndOrderLines();
      const orderLine = new OrderLine('order-123', 'SMALL-TABLE', 21);

      expect(() => batch.allocate(orderLine)).toThrow(
        new UnprocessableInputError('Cannot allocate an order line to a batch: not enough quantity'),
      );
    });

    it('should throw an error when allocating a non existing order line', () => {
      const [batch] = createBatchAndOrderLines();
      const orderLine = new OrderLine('order-123', 'NON-EXISTING', 10);

      expect(() => batch.allocate(orderLine)).toThrow(
        new NotFoundError('Cannot allocate an order line to a batch: non existing SKU'),
      );
    });

    it('should throw an error when allocating an order line to a batch that has been allocated already', () => {
      const [batch, orderLine] = createBatchAndOrderLines();

      batch.allocate(orderLine);

      expect(() => batch.allocate(orderLine)).toThrow(
        new UnprocessableInputError(
          'Cannot allocate an order line to a batch: the order line has already been allocated',
        ),
      );
    });
  });

  describe('deallocation', () => {
    it('should increase the available quantity when deallocating an order line from a batch', () => {
      const [batch, orderLine] = createBatchAndOrderLines();

      batch.allocate(orderLine);
      batch.deallocate(orderLine);

      expect(batch.availableQuantity).toEqual(20);
    });

    it('should increase the available quantity when deallocating multiple order lines from a batch', () => {
      const [batch, ...orderLines] = createBatchAndOrderLines();

      orderLines.forEach((orderLine) => batch.allocate(orderLine));
      orderLines.forEach((orderLine) => batch.deallocate(orderLine));

      expect(batch.availableQuantity).toEqual(20);
    });

    it('should not increase the available quantity and throw an error when deallocating an order line that has not been allocated', () => {
      const [batch, orderLine] = createBatchAndOrderLines();

      expect(() => batch.deallocate(orderLine)).toThrow(
        new NotFoundError('Cannot deallocate an order line to a batch: this SKU has not been allocated'),
      );
    });
  });
});

function createBatchAndOrderLines() {
  const orderLines = [
    new OrderLine('order-123', 'SMALL-TABLE', 1),
    new OrderLine('order-123', 'SMALL-TABLE', 2),
    new OrderLine('order-123', 'SMALL-TABLE', 3),
  ] as const;

  const batch = new Batch({
    reference: 'batch-001',
    sku: 'SMALL-TABLE',
    purchasedQuantity: 20,
    allocatedOrderLines: new Set(),
    eta: new Date(1000),
  });

  return [batch, ...orderLines] as const;
}
