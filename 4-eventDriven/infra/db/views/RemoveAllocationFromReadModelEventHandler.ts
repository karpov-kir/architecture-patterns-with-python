import { AllocatedEvent } from '../../../domain/events/AllocatedEvent';
import { EventHandler } from '../../../shared/Event';
import { TypeOrmConnectionPool } from '../TypeOrmConnectionPool';

export class RemoveAllocationFromReadModelEventHandler implements EventHandler<AllocatedEvent> {
  public async handle(event: AllocatedEvent): Promise<void> {
    const connectionPool = await TypeOrmConnectionPool.getInstance();

    return connectionPool.query(
      `
      DELETE FROM "allocationsView"
      WHERE "orderId" = $1 AND sku = $2
    `,
      [event.props.orderId, event.props.sku],
    );
  }
}
