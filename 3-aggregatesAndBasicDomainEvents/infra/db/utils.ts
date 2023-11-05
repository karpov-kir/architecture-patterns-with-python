import { dirname } from 'path';
import { MigrationFn as UmzugMigrationFn, Umzug } from 'umzug';
import { fileURLToPath } from 'url';

import { TypeOrmConnectionPool } from './TypeOrmConnectionPool';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationContext {
  query: <T = unknown>(sql: string, parameters?: unknown[]) => Promise<T>;
}

export type MigrationFn = UmzugMigrationFn<MigrationContext>;

interface MigrationLog {
  name: string;
}

const migrationTable = 'migrations';

const getContext = async (): Promise<MigrationContext> => {
  return {
    query: async <T>(sql: string, parameters?: unknown[]): Promise<T> => {
      const connectionPool = await TypeOrmConnectionPool.getInstance();

      return connectionPool.query<T>(sql, parameters);
    },
  };
};

export async function applyDbMigrations() {
  const migrator = new Umzug({
    migrations: {
      glob: ['migrations/*.ts', { cwd: __dirname }],
    },
    context: await getContext(),
    storage: {
      async executed({ context: client }) {
        await client.query(`create table if not exists ${migrationTable}(name text)`);
        const results = await client.query<MigrationLog[]>(`select name from ${migrationTable}`);

        return results.map((result) => result.name);
      },

      async logMigration({ name, context: client }) {
        await client.query(`insert into ${migrationTable}(name) values ($1)`, [name]);
      },

      async unlogMigration({ name, context: client }) {
        await client.query(`delete from ${migrationTable} where name = $1`, [name]);
      },
    },
    logger: console,
  });

  await migrator.up();
}
