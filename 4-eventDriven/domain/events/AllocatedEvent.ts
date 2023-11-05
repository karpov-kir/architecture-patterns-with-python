import { Event } from '../../shared/Event';

interface AllocatedEventProps {
  orderId: string;
  sku: string;
  quantity: number;
  batchReference: string;
}

export class AllocatedEvent extends Event<AllocatedEventProps> {}
