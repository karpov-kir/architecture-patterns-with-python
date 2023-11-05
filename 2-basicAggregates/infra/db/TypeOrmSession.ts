import { QueryRunner } from 'typeorm';

import { TypeOrmConnectionPool } from './TypeOrmConnectionPool';

export class TypeOrmSession {
  public static async create(): Promise<TypeOrmSession> {
    const connectionPool = await TypeOrmConnectionPool.getInstance();
    const queryRunner = connectionPool.createQueryRunner();

    await queryRunner.connect();

    // To enforce optimistic locking. Could be done differently, but this way is fine enough for now.
    await queryRunner.startTransaction('REPEATABLE READ');

    return new TypeOrmSession(queryRunner);
  }

  public get isTransactionActive() {
    return this.queryRunner.isTransactionActive;
  }

  public get manager() {
    return this.queryRunner.manager;
  }

  private constructor(private queryRunner: QueryRunner) {}

  public async commit() {
    try {
      await this.queryRunner.commitTransaction();
    } finally {
      await this.queryRunner.release();
    }
  }

  public async rollback() {
    try {
      await this.queryRunner.rollbackTransaction();
    } finally {
      await this.queryRunner.release();
    }
  }
}
