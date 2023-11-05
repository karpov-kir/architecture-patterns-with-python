import { Aggregate } from '../shared/Aggregate';
import { NotFoundError } from '../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { Batch } from './Batch';
import { AllocateCommand } from './commands/AllocateCommand';
import { AllocatedEvent } from './events/AllocatedEvent';
import { DeallocatedEvent } from './events/DeallocatedEvent';
import { OutOfStockEvent } from './events/OutOfStockEvent';
import { OrderLine } from './OrderLine';

export interface ProductProperties {
  version: number;
  sku: string;
  batches: Batch[];
}

export class Product extends Aggregate<ProductProperties> {
  public greaterThan = undefined;

  constructor(props: ProductProperties) {
    super(props);

    props.batches.sort((a, b) => (a.greaterThan(b) ? 1 : -1));
  }

  public hash(): string {
    return this.props.sku;
  }

  public allocate(orderLine: OrderLine): Batch | undefined {
    const batches = this.props.batches;

    if (this.props.sku !== orderLine.props.sku) {
      throw new UnprocessableInputError(`Invalid SKU ${orderLine.props.sku}`);
    }

    for (const batch of batches) {
      try {
        batch.allocate(orderLine);

        this._props.version++;

        this._events.push(
          new AllocatedEvent({
            orderId: orderLine.props.orderId,
            sku: orderLine.props.sku,
            quantity: orderLine.props.quantity,
            batchReference: batch.props.reference,
          }),
        );

        return batch;
      } catch (error) {}
    }

    this._events.push(
      new OutOfStockEvent({
        sku: orderLine.props.sku,
      }),
    );
  }

  public addBatch(batch: Batch) {
    if (batch.props.sku !== this.props.sku) {
      throw new UnprocessableInputError(`All product's batches must have the same sku as the product`);
    }

    this._props.version++;
    this._props.batches.push(batch);
  }

  public changeBatchQuantity(reference: string, quantity: number) {
    const batches = this.props.batches;
    const batch = batches.find((batch) => batch.props.reference === reference);

    if (!batch) {
      throw new NotFoundError(`Batch with reference ${reference} is not found`);
    }

    batch.changePurchasedQuantity(quantity);

    while (batch.availableQuantity < 0) {
      const orderLine = batch.deallocateLatestOrderLine();
      // The order line needs to be reallocated to another batch
      this._events.push(
        new DeallocatedEvent({
          orderId: orderLine.props.orderId,
          sku: orderLine.props.sku,
          quantity: orderLine.props.quantity,
        }),
      );
    }

    this._props.version++;
  }
}
