import knex, { Knex } from 'knex';
import { QueryResult } from 'pg';

import { getKnexConfig } from './utils';

export class KnexSession {
  private static connectionPool = knex(getKnexConfig());

  public static async create(): Promise<KnexSession> {
    const transaction = await this.connectionPool.transaction();
    return new KnexSession(transaction);
  }

  private constructor(private transaction: Knex.Transaction) {}

  public async commit() {
    await this.transaction.commit();
  }

  public async rollback() {
    await this.transaction.rollback();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async query<T extends Record<string, any> = Record<string, any>>(
    sql: string,
    parameters?: Record<string, unknown>,
  ): Promise<T[]> {
    let data: QueryResult<T>;

    if (parameters) {
      data = await this.transaction.raw<QueryResult>(sql, parameters);
    } else {
      data = await this.transaction.raw<QueryResult>(sql);
    }

    return data.rows;
  }
}
