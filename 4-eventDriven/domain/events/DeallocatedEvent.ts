import { Event } from '../../shared/Event';

interface DeallocatedEventProps {
  orderId: string;
  sku: string;
  quantity: number;
}

export class DeallocatedEvent extends Event<DeallocatedEventProps> {}
