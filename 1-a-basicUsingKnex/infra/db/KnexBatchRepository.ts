import crypto from 'crypto';

import { Batch } from '../../domain/Batch';
import { OrderLine } from '../../domain/OrderLine';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { BatchRepository } from '../../useCases/UnitOfWork';
import { KnexSession } from './KnexSession';

interface BatchRecord {
  id: number;
  reference: string;
  sku: string;
  purchasedQuantity: number;
  eta?: Date;
}

interface OrderLineRecord {
  id: number;
  orderId: string;
  sku: string;
  quantity: number;
}

interface AllocationTable {
  id: number;
  batchId: number;
  orderLineId: number;
}

export class KnexBatchRepository implements BatchRepository {
  constructor(private readonly session: KnexSession) {}

  public async saveNew(batch: Batch): Promise<void> {
    await this.session.query<BatchRecord>(
      `
      INSERT INTO batches (id, reference, sku, "purchasedQuantity", eta)
      VALUES (:id, :reference, :sku, :purchasedQuantity, :eta)
    `,
      {
        id: hashBatch(batch),
        reference: batch.props.reference,
        sku: batch.props.sku,
        purchasedQuantity: batch.props.purchasedQuantity,
        eta: batch.props.eta,
      },
    );
  }

  public async get(reference: string): Promise<Batch> {
    const [batchRecord] = await this.session.query<BatchRecord>(
      `
      SELECT id, reference, sku, "purchasedQuantity", eta FROM batches WHERE reference = :reference
    `,
      { reference },
    );

    if (!batchRecord) {
      throw new NotFoundError('Batch is not found');
    }

    const allocatedOrderLineRecords = await this.session.query<OrderLineRecord>(
      `
      SELECT "orderLines".* FROM allocations
      LEFT JOIN "orderLines" ON "orderLines".id = allocations."orderLineId"
      WHERE allocations."batchId" = :batchId
    `,
      { batchId: batchRecord.id },
    );

    const allocatedOrderLines = new Set<OrderLine>(
      allocatedOrderLineRecords.map(
        (orderLineRecord) => new OrderLine(orderLineRecord.orderId, orderLineRecord.sku, orderLineRecord.quantity),
      ),
    );

    return new Batch({
      reference: batchRecord.reference,
      sku: batchRecord.sku,
      purchasedQuantity: batchRecord.purchasedQuantity,
      allocatedOrderLines,
      eta: batchRecord.eta,
    });
  }

  public async list(): Promise<Batch[]> {
    const batchRecords = await this.session.query<BatchRecord>(`
      SELECT id, reference, sku, "purchasedQuantity", eta FROM batches
    `);
    const allocatedOrderLineRecords = batchRecords.length
      ? await this.session.query<OrderLineRecord & Pick<AllocationTable, 'batchId'>>(
          `
        SELECT allocations."batchId", "orderLines".* FROM allocations
        LEFT JOIN "orderLines" ON "orderLines".id = allocations."orderLineId"
        WHERE allocations."batchId" IN (:batchIds)
      `,
          { batchIds: batchRecords.map((batchRecord) => batchRecord.id).join(',') },
        )
      : [];

    return batchRecords.map(
      (batchRecord) =>
        new Batch({
          reference: batchRecord.reference,
          sku: batchRecord.sku,
          purchasedQuantity: batchRecord.purchasedQuantity,
          allocatedOrderLines: new Set<OrderLine>(
            allocatedOrderLineRecords
              .filter((allocatedOrderLineRecord) => allocatedOrderLineRecord.batchId === batchRecord.id)
              .map(
                (allocatedOrderLineRecord) =>
                  new OrderLine(
                    allocatedOrderLineRecord.orderId,
                    allocatedOrderLineRecord.sku,
                    allocatedOrderLineRecord.quantity,
                  ),
              ),
          ),
          eta: batchRecord.eta,
        }),
    );
  }

  async saveOrderLineAllocation(batch: Batch, orderLine: OrderLine): Promise<void> {
    const [{ id: orderLineId }] = await this.session.query<{ id: string }>(
      `
      INSERT INTO "orderLines" (id, "orderId", sku, quantity)
      VALUES (:id, :orderId, :sku, :quantity)
      RETURNING id
    `,
      {
        id: hashOrderLine(orderLine),
        orderId: orderLine.orderId,
        sku: orderLine.sku,
        quantity: orderLine.quantity,
      },
    );

    await this.session.query(
      `
      INSERT INTO allocations (id, "orderLineId", "batchId")
      VALUES (:id, :orderLineId, :batchId)
    `,
      {
        id: hashAllocation(batch, orderLine),
        orderLineId,
        batchId: hashBatch(batch),
      },
    );
  }
}

/**
 * An attempt to use a hash function to generate unique DB IDs that don't make sense to the domain model and avoid them leaking into the domain model props.
 *  - `OrderLine` is a value object, which should not have an ID, but we still want to store it in the DB, so we need an ID.
 *  - `Batch` is an entity, which is identified by the `reference` field. While it's true that the `reference` could be used as the primary key in the DB,
 *     but since it can be a quite long arbitrary text, it's been decided to use another (smaller) generated ID instead.
 *
 * I think, It's better to use an approach implemented in the TypeORM version (pass the DB IDs within `Entity.meta` and `ValueObject.meta`),
 * because that approach is more explicit and straightforward.
 */
const hashString = (string: string) => {
  return crypto.createHmac('sha1', 'key').update(string).digest('hex');
};

const hashBatch = (batch: Batch) => {
  return hashString(batch.props.reference);
};

const hashOrderLine = (orderLine: OrderLine) => {
  return hashString([orderLine.sku, orderLine.quantity, orderLine.orderId].join('-'));
};

const hashAllocation = (batch: Batch, orderLine: OrderLine) => {
  return hashString([batch.props.reference, orderLine.sku, orderLine.quantity].join('-'));
};
