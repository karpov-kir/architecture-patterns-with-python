import { MigrationFn } from '../utils';

export const up: MigrationFn = async ({ context: { query } }) => {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      sku VARCHAR(255) PRIMARY KEY,
      "version" INT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS batches (
      id SERIAL PRIMARY KEY,
      reference VARCHAR(255) NOT NULL,
      sku VARCHAR(255) NOT NULL REFERENCES products(sku),
      "purchasedQuantity" INT NOT NULL,
      eta TIMESTAMPTZ NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "orderLines" (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      "orderId" VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS allocations (
      id SERIAL PRIMARY KEY,
      "orderLineId" INT NOT NULL REFERENCES "orderLines"(id),
      "batchId" INT NOT NULL REFERENCES batches(id),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const down = async () => {
  // No down migration
};
