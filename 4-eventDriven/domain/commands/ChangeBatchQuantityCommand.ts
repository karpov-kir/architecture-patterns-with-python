import { Event } from '../../shared/Event';

interface ChangeBatchQuantityCommandProps {
  batchReference: string;
  quantity: number;
}

export class ChangeBatchQuantityCommand extends Event<ChangeBatchQuantityCommandProps> {}
