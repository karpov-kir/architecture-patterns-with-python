import { applyDbMigrations } from '../infra/db/utils';

export class GlobalTestsSetup {
  public static async setUp() {
    await this.setUpDatabase();
  }

  private static async setUpDatabase() {
    await applyDbMigrations();
  }
}
