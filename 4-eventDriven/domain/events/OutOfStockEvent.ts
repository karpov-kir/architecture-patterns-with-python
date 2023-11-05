import { Event } from '../../shared/Event';

interface OutOfStockEventProps {
  sku: string;
}

export class OutOfStockEvent extends Event<OutOfStockEventProps> {}
