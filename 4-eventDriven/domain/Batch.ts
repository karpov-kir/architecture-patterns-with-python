import { Entity } from '../shared/Entity';
import { NotFoundError } from '../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { OrderLine } from './OrderLine';

export interface BatchProperties {
  reference: string;
  sku: string;
  purchasedQuantity: number;
  allocatedOrderLines: OrderLine[];
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
    if (orderLine.props.sku !== this.props.sku) {
      throw new NotFoundError('Cannot allocate an order line to a batch: non existing SKU');
    }

    if (this.props.allocatedOrderLines.some((allocatedOrderLine) => allocatedOrderLine.equals(orderLine))) {
      throw new UnprocessableInputError(
        'Cannot allocate an order line to a batch: the order line has already been allocated',
      );
    }

    if (orderLine.props.quantity > this.availableQuantity) {
      throw new UnprocessableInputError('Cannot allocate an order line to a batch: not enough quantity');
    }

    this._props.allocatedOrderLines.push(orderLine);
  }

  public deallocate(orderLine: OrderLine): void {
    const allocatedOrderLineIndex = this.props.allocatedOrderLines.findIndex((allocatedOrderLine) =>
      allocatedOrderLine.equals(orderLine),
    );

    if (allocatedOrderLineIndex === -1) {
      throw new NotFoundError('Cannot deallocate an order line to a batch: this SKU has not been allocated');
    }

    this._props.allocatedOrderLines.splice(allocatedOrderLineIndex, 1);
  }

  public deallocateLatestOrderLine(): OrderLine {
    const deallocatedOrderLine = this._props.allocatedOrderLines.pop();

    if (!deallocatedOrderLine) {
      throw new UnprocessableInputError('Cannot deallocate the latest order line to a batch: the batch is empty');
    }

    return deallocatedOrderLine;
  }

  public get allocatedQuantity(): number {
    return this.props.allocatedOrderLines.reduce((accumulator, orderLine) => accumulator + orderLine.props.quantity, 0);
  }

  public get availableQuantity(): number {
    return this.props.purchasedQuantity - this.allocatedQuantity;
  }

  public changePurchasedQuantity(quantity: number) {
    if (quantity < 0) {
      throw new UnprocessableInputError('Purchased quantity must be greater or equal zero');
    }

    this._props.purchasedQuantity = quantity;
  }
}
