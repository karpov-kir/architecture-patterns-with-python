import { OrderLine, OrderLineProperties } from '../../domain/OrderLine';
import { randomHash } from '../utils';

export class OrderLineObjectMother {
  public static default(orderLineProperties?: Partial<OrderLineProperties>) {
    return new OrderLine({
      orderId: randomHash('order'),
      sku: 'SMALL-TABLE',
      quantity: 5,
      ...orderLineProperties,
    });
  }
}
