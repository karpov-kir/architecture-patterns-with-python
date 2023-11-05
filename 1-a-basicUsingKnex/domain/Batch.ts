import isEqual from 'lodash.isequal';

import { Entity } from '../shared/Entity';
import { NotFoundError } from '../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { OrderLine } from './OrderLine';

export interface BatchProperties {
  reference: string;
  sku: string;
  purchasedQuantity: number;
  allocatedOrderLines: Set<OrderLine>;
  eta?: Date;
}

export class Batch extends Entity<BatchProperties> {
  constructor(props: BatchProperties) {
    super(props);
  }

  public hash(): string {
    return this.props.reference;
  }

  public greaterThan(other: Batch): boolean {
    if (this.props.eta === undefined) {
      return false;
    } else if (other.props.eta === undefined) {
      return true;
    }

    return this.props.eta > other.props.eta;
  }

  public allocate(orderLine: OrderLine): void {
    if (orderLine.sku !== this.props.sku) {
      throw new NotFoundError('Cannot allocate an order line to a batch: non existing SKU');
    }

    if (
      Array.from(this.props.allocatedOrderLines).some((allocatedOrderLine) => isEqual(allocatedOrderLine, orderLine))
    ) {
      throw new UnprocessableInputError(
        'Cannot allocate an order line to a batch: the order line has already been allocated',
      );
    }

    if (orderLine.quantity > this.availableQuantity) {
      throw new UnprocessableInputError('Cannot allocate an order line to a batch: not enough quantity');
    }

    this._props.allocatedOrderLines.add(orderLine);
  }

  public deallocate(orderLine: OrderLine): void {
    const allocatedOrderLine = Array.from(this.props.allocatedOrderLines).find((allocatedOrderLine) =>
      isEqual(allocatedOrderLine, orderLine),
    );

    if (!allocatedOrderLine) {
      throw new NotFoundError('Cannot deallocate an order line to a batch: this SKU has not been allocated');
    }

    this._props.allocatedOrderLines.delete(allocatedOrderLine);
  }

  public get allocatedQuantity(): number {
    return Array.from(this.props.allocatedOrderLines).reduce(
      (accumulator, orderLine) => accumulator + orderLine.quantity,
      0,
    );
  }

  public get availableQuantity(): number {
    return this.props.purchasedQuantity - this.allocatedQuantity;
  }
}
