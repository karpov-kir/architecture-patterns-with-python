import { ValueObject } from '../shared/ValueObject';

export interface OrderLineProperties {
  orderId: string;
  sku: string;
  quantity: number;
}

export class OrderLine extends ValueObject<OrderLineProperties> {
  constructor(props: OrderLineProperties) {
    super(props);
  }
}
