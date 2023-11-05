import { Event } from '../../shared/Event';

interface AllocateCommandProps {
  orderId: string;
  sku: string;
  quantity: number;
}

export class AllocateCommand extends Event<AllocateCommandProps> {}
