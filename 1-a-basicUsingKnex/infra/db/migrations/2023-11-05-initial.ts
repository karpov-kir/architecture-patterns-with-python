import { MigrationFn } from '../utils';

export const up: MigrationFn = async ({ context: { query } }) => {
  await query(`
    CREATE TABLE IF NOT EXISTS batches (
      id VARCHAR(128) PRIMARY KEY,
      reference VARCHAR(255) NOT NULL,
      sku VARCHAR(255) NOT NULL,
      "purchasedQuantity" INT NOT NULL,
      eta TIMESTAMPTZ NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "orderLines" (
      id VARCHAR(128) PRIMARY KEY,
      sku VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      "orderId" VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS allocations (
      id VARCHAR(128) PRIMARY KEY,
      "orderLineId" VARCHAR(128) NOT NULL REFERENCES "orderLines"(id),
      "batchId" VARCHAR(128) NOT NULL REFERENCES batches(id),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const down = async () => {
  // No down migration
};
