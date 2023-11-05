import { afterAll, describe, expect, it } from 'bun:test';

import { Batch } from '../../../domain/Batch';
import { BatchObjectMother } from '../../../tests/objectMothers/BatchObjectMother';
import { OrderLineObjectMother } from '../../../tests/objectMothers/LineOrderObjectMother';
import { BatchRecord, fromPersistance } from '../TypeOrmBatchRepository';
import { TypeOrmConnectionPool } from '../TypeOrmConnectionPool';
import { TypeOrmUnitOfWork } from '../TypeOrmUnitOfWork';

afterAll(async () => {
  await TypeOrmConnectionPool.destroy();
});

describe(TypeOrmUnitOfWork.name, () => {
  it('should retrieve a batch and allocate to it', async () => {
    const unitOfWork = await TypeOrmUnitOfWork.create();

    const rawInsertedBatch = await rawInsertBatch(BatchObjectMother.default());
    const orderLineToAllocate = OrderLineObjectMother.default();

    const batchFromRepo = await unitOfWork.batchRepository.get(rawInsertedBatch.props.reference);

    batchFromRepo.allocate(orderLineToAllocate);

    await unitOfWork.batchRepository.save(batchFromRepo);
    await unitOfWork.commit();

    const rawBatchReference = await rawGetAllocatedBatchRef(orderLineToAllocate.props.orderId, batchFromRepo.props.sku);
    expect(rawBatchReference).toEqual(batchFromRepo.props.reference);
  });

  it('should roll back an uncommitted transaction', async () => {
    const unitOfWork = await TypeOrmUnitOfWork.create();
    const connection = await TypeOrmConnectionPool.getInstance();

    const batch = BatchObjectMother.default();
    const orderLine = OrderLineObjectMother.default();

    batch.allocate(orderLine);

    await unitOfWork.batchRepository.save(batch);
    await unitOfWork.rollback();

    expect(
      await connection.query<BatchRecord[]>(`SELECT * FROM batches where reference = $1`, [batch.props.reference]),
    ).toEqual([]);
  });
});

const rawInsertBatch = async (batch: Batch) => {
  const connection = await TypeOrmConnectionPool.getInstance();
  const [batchRecord] = await connection.query<BatchRecord[]>(
    `INSERT INTO batches (reference, sku, "purchasedQuantity", eta) VALUES ($1, $2, $3, $4) RETURNING *`,
    [batch.props.reference, batch.props.sku, batch.props.purchasedQuantity, batch.props.eta],
  );

  return fromPersistance(batchRecord);
};

const rawGetAllocatedBatchRef = async (orderId: string, sku: string) => {
  const connection = await TypeOrmConnectionPool.getInstance();
  const [{ id: orderLineId }] = await connection.query<{ id: string }[]>(
    `SELECT id FROM "orderLines" WHERE "orderId"=$1 AND sku=$2`,
    [orderId, sku],
  );
  const [{ reference: batchReference }] = await connection.query<{ reference: string }[]>(
    `SELECT b.reference FROM allocations JOIN batches AS b ON "batchId" = b.id WHERE "orderLineId"=$1`,
    [orderLineId],
  );

  return batchReference;
};
