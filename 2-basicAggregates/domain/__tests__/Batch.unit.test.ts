import { describe, expect, it } from 'bun:test';

import { NotFoundError } from '../../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../../shared/errors/UnprocessableInputError';
import { BatchObjectMother } from '../../tests/objectMothers/BatchObjectMother';
import { OrderLineObjectMother } from '../../tests/objectMothers/LineOrderObjectMother';
import { Batch } from '../Batch';
import { OrderLine } from '../OrderLine';

describe(Batch.name, () => {
  describe('allocation', () => {
    it('should reduce the available quantity when allocating an order line to a batch', () => {
      const [batch, orderLine] = createBatchAndOrderLines();

      batch.allocate(orderLine);

      expect(batch.availableQuantity).toEqual(15);
    });

    it('should reduce the available quantity when allocating multiple order lines to a batch', () => {
      const [batch, ...orderLines] = createBatchAndOrderLines();

      orderLines.forEach((orderLine) => batch.allocate(orderLine));

      expect(batch.availableQuantity).toEqual(5);
    });

    it('should throw an error if the batch does not have enough quantity when allocating an order line', () => {
      const [batch] = createBatchAndOrderLines();
      const orderLine = OrderLineObjectMother.default({ sku: batch.props.sku, quantity: 100 });

      expect(() => batch.allocate(orderLine)).toThrow(
        new UnprocessableInputError('Cannot allocate an order line to a batch: not enough quantity'),
      );
    });

    it('should throw an error when allocating a non existing order line', () => {
      const [batch] = createBatchAndOrderLines();
      const orderLine = new OrderLine({
        orderId: 'order-123',
        sku: 'NON-EXISTING',
        quantity: 10,
      });

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
  const batch = BatchObjectMother.default();
  const orderLines = [
    OrderLineObjectMother.default({ sku: batch.props.sku }),
    OrderLineObjectMother.default({ sku: batch.props.sku }),
    OrderLineObjectMother.default({ sku: batch.props.sku }),
  ] as const;

  return [batch, ...orderLines] as const;
}
