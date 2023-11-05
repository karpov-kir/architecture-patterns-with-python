import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { ChangeBatchQuantityCommand } from '../../domain/commands/ChangeBatchQuantityCommand';
import { AllocatedEvent } from '../../domain/events/AllocatedEvent';
import { TypeOrmConnectionPool } from '../../infra/db/TypeOrmConnectionPool';
import { JustLogEmailService } from '../../infra/JustLogEmailService';
import { RedisEventBus } from '../../infra/RedisEventBus';
import { sendAddBatchRequest, sendAllocateRequest, sendGetOrderAllocationsRequest } from '../../tests/httpDriver';
import { BatchObjectMother } from '../../tests/objectMothers/BatchObjectMother';
import { randomHash, waitForElementsInArray } from '../../tests/utils';
import { CompositionRoot } from '../CompositionRoot';

const justLogEmailService = new JustLogEmailService();
const compositionRoot = await CompositionRoot.create({ emailService: justLogEmailService });

const {
  webServerCompositionRoot: { webServer },
  eventBusCompositionRoot: { externalEventBus },
} = compositionRoot;

beforeAll(async () => {
  await compositionRoot.start();
});

afterAll(async () => {
  await webServer.stop();
  await TypeOrmConnectionPool.destroy();
  await RedisEventBus.destroy();
});

describe(CompositionRoot.name, () => {
  describe('web server', () => {});

  describe('happy path', () => {
    it('should allocate a batch', async () => {
      const sku = randomHash('SMALL-TABLE');
      const earliest = BatchObjectMother.withTomorrowsEta({ sku });
      const medium = BatchObjectMother.withAfterTomorrowsEta({ sku });
      const latest = BatchObjectMother.withLatestEta({ sku });
      const orderId = randomHash('order');

      await sendAddBatchRequest(medium);
      await sendAddBatchRequest(earliest);
      await sendAddBatchRequest(latest);

      const allocateResponse = await sendAllocateRequest({
        orderId,
        sku,
        quantity: 3,
      });
      const orderAllocationsResponse = await sendGetOrderAllocationsRequest(orderId);

      expect(allocateResponse.status).toEqual(204);
      expect(orderAllocationsResponse.data).toEqual([
        {
          batchReference: earliest.props.reference,
          sku,
        },
      ]);
    });
  });

  describe('unhappy path', () => {
    it('should return 400 when the sku is not found', async () => {
      const nonExistingSku = randomHash('NON-EXISTING');

      await sendAddBatchRequest(BatchObjectMother.default());

      const response = await sendAllocateRequest({
        orderId: randomHash('order'),
        sku: nonExistingSku,
        quantity: 3,
      });

      expect(response.status).toEqual(404);
      expect(response.data).toEqual({
        message: expect.stringContaining(nonExistingSku),
      });
    });

    it('should return an out of stock error and send an out of stock email', async () => {
      const sku = randomHash('SMALL-TABLE');
      const batch = BatchObjectMother.default({ sku });

      await sendAddBatchRequest(batch);

      const response = await sendAllocateRequest({
        orderId: randomHash('order'),
        sku,
        quantity: batch.props.purchasedQuantity + 1,
      });

      await waitForElementsInArray(justLogEmailService.sentEmails);

      expect(response.status).toEqual(400);
      expect(response.data).toEqual({
        message: `Out of stock for SKU ${sku}`,
      });
      expect(justLogEmailService.sentEmails).toEqual([
        {
          to: 'admin@test.com',
          body: `Out of stock: ${sku}`,
        },
      ]);
    });
  });

  describe('external events', () => {
    it('event bus composition', async () => {
      const sku = randomHash('SMALL-TABLE');
      const earliest = BatchObjectMother.withTomorrowsEta({ sku });
      const latest = BatchObjectMother.withLatestEta({ sku });
      const orderId = randomHash('order');
      const quantityToAllocate = earliest.props.purchasedQuantity;

      await sendAddBatchRequest(earliest);
      await sendAddBatchRequest(latest);

      await sendAllocateRequest({
        orderId,
        sku,
        quantity: quantityToAllocate,
      });

      const newAllocatedEvents: AllocatedEvent[] = [];

      // Listen for the future allocated event
      externalEventBus.subscribe(AllocatedEvent, {
        handle: async (event): Promise<void> => {
          newAllocatedEvents.push(event);
        },
      });

      // Change the quantity on the allocated batch so it's less than our order.
      await externalEventBus.publish(
        new ChangeBatchQuantityCommand({
          batchReference: earliest.props.reference,
          quantity: quantityToAllocate - 1,
        }),
      );

      await waitForElementsInArray(newAllocatedEvents);

      expect(newAllocatedEvents).toEqual([
        new AllocatedEvent({
          orderId,
          sku,
          quantity: quantityToAllocate,
          // The order should be reallocated to the other batch
          batchReference: latest.props.reference,
        }),
      ]);
    });
  });
});
