import { Event } from '../../shared/Event';

interface AddBatchCommandProps {
  reference: string;
  sku: string;
  purchasedQuantity: number;
  eta?: Date;
}

export class AddBatchCommand extends Event<AddBatchCommandProps> {}
