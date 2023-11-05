import { afterAll, describe, expect, it } from 'bun:test';
import clone from 'clone';

import { Batch } from '../../domain/Batch';
import { assertError } from '../../shared/isError';
import { BatchObjectMother } from '../../tests/objectMothers/BatchObjectMother';
import { OrderLineObjectMother } from '../../tests/objectMothers/LineOrderObjectMother';
import { ProductObjectMother } from '../../tests/objectMothers/ProductObjectMother';
import { randomHash } from '../../tests/utils';
import { TypeOrmConnectionPool } from '../db/TypeOrmConnectionPool';
import { BatchRecord, fromPersistance, ProductRecord } from '../db/TypeOrmProductsRepository';
import { InMemoryEventBus } from '../pubSub/InMemoryEventBus';
import { TypeOrmUnitOfWork } from '../TypeOrmUnitOfWork';

afterAll(async () => {
  await TypeOrmConnectionPool.destroy();
});

const eventBus = new InMemoryEventBus();

describe(TypeOrmUnitOfWork.name, () => {
  it('should save and retrieve a product', async () => {
    const unitOfWork = await TypeOrmUnitOfWork.create(eventBus);
    const product = ProductObjectMother.withManyBatches();

    await unitOfWork.productRepository.save(product);

    const productFromRepo = await unitOfWork.productRepository.get(product.props.sku);

    await unitOfWork.commit();

    expect(product).toEqual(productFromRepo);
  });

  it('should retrieve a product and allocate to it', async () => {
    const unitOfWork = await TypeOrmUnitOfWork.create(eventBus);
    const batch = BatchObjectMother.default();

    const rawInsertedProduct = await rawInsertProduct(batch.props.sku);
    await rawInsertBatch(batch);

    const orderLineToAllocate = OrderLineObjectMother.default({ sku: batch.props.sku });
    const productFromRepo = await unitOfWork.productRepository.get(rawInsertedProduct.sku);
    const batchFromRepo = productFromRepo.props.batches[0];

    productFromRepo.allocate(orderLineToAllocate);

    await unitOfWork.productRepository.save(productFromRepo);
    await unitOfWork.commit();

    const rawBatchReference = await rawGetAllocatedBatchRef(
      orderLineToAllocate.props.orderId,
      productFromRepo.props.sku,
    );
    expect(rawBatchReference).toEqual(batchFromRepo.props.reference);
  });

  it('should roll back an uncommitted transaction', async () => {
    const unitOfWork = await TypeOrmUnitOfWork.create(eventBus);
    const connection = await TypeOrmConnectionPool.getInstance();

    const product = ProductObjectMother.default();
    const batch = product.props.batches[0];
    const orderLine = OrderLineObjectMother.default({ sku: batch.props.sku });

    product.allocate(orderLine);

    await unitOfWork.productRepository.save(product);
    await unitOfWork.rollback();

    expect(await connection.query<BatchRecord[]>(`SELECT * FROM products where sku = $1`, [product.props.sku])).toEqual(
      [],
    );
  });

  it(
    'should not allow concurrent updates',
    async () => {
      const sku = randomHash('SMALL-TABLE');

      const productRecord = await rawInsertProduct(sku);
      const product1 = fromPersistance(clone(productRecord));
      const product2 = fromPersistance(clone(productRecord));

      const unitOfWork1 = await TypeOrmUnitOfWork.create(eventBus);
      const unitOfWork2 = await TypeOrmUnitOfWork.create(eventBus);

      const batchToAdd = BatchObjectMother.default({ sku });

      product1.addBatch(batchToAdd);
      product2.addBatch(batchToAdd);

      let caughtError: unknown;

      try {
        await Promise.all([
          unitOfWork1.productRepository
            .save(product1)
            .then(() => new Promise<void>((resolve) => setTimeout(resolve, 200)))
            .then(() => unitOfWork1.commit()),
          unitOfWork2.productRepository
            .save(product2)
            .then(() => new Promise<void>((resolve) => setTimeout(resolve, 200)))
            .then(() => unitOfWork2.commit()),
        ]);
      } catch (error) {
        caughtError = error;
      }

      assertError(caughtError);

      const finalUnitOfWork = await TypeOrmUnitOfWork.create(eventBus);
      const finalProduct = await finalUnitOfWork.productRepository.get(sku);

      expect(caughtError.message).toEqual('could not serialize access due to concurrent update');
      expect(finalProduct.props.version).toEqual(2);
    },
    {
      timeout: 1000000,
    },
  );
});

const rawInsertProduct = async (sku: string) => {
  const connection = await TypeOrmConnectionPool.getInstance();
  const [productRecord] = await connection.query<ProductRecord[]>(
    `INSERT INTO products (sku, version) VALUES ($1, $2) RETURNING *`,
    [sku, 1],
  );

  return productRecord;
};

const rawInsertBatch = async (batch: Batch) => {
  const connection = await TypeOrmConnectionPool.getInstance();
  const [_batchRecord] = await connection.query<BatchRecord[]>(
    `INSERT INTO batches (reference, sku, "purchasedQuantity", eta) VALUES ($1, $2, $3, $4) RETURNING *`,
    [batch.props.reference, batch.props.sku, batch.props.purchasedQuantity, batch.props.eta],
  );
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
