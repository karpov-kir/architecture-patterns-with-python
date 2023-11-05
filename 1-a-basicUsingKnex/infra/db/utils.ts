import knex, { Knex } from 'knex';
import { dirname } from 'path';
import { QueryResult } from 'pg';
import { MigrationFn as UmzugMigrationFn, Umzug } from 'umzug';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: <T extends Record<string, any> = Record<string, any>>(
    sql: string,
    parameters?: Record<string, unknown>,
  ) => Promise<T[]>;
}

export type MigrationFn = UmzugMigrationFn<MigrationContext>;

interface MigrationLog {
  name: string;
}

const migrationTable = 'migrations';

export const getKnexConfig = (): Knex.Config => ({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  },
});

const getContext = async (): Promise<MigrationContext> => {
  const connection = knex(getKnexConfig());

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: async <T extends Record<string, any> = Record<string, any>>(
      sql: string,
      parameters?: Record<string, unknown>,
    ) => {
      let data: QueryResult<T>;

      if (parameters) {
        data = await connection.raw<QueryResult>(sql, parameters);
      } else {
        data = await connection.raw<QueryResult>(sql);
      }

      return data.rows;
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
      async executed({ context: { query } }) {
        await query(`create table if not exists ${migrationTable}(name text)`);
        const results = await query<MigrationLog>(`select name from ${migrationTable}`);

        return results.map((result) => result.name);
      },

      async logMigration({ name, context: client }) {
        await client.query(`insert into ${migrationTable}(name) values (:name)`, { name });
      },

      async unlogMigration({ name, context: client }) {
        await client.query(`delete from ${migrationTable} where name = :name`, { name });
      },
    },
    logger: console,
  });

  await migrator.up();
}
