import { listen } from './entrypoints/server';
import { applyDbMigrations } from './infra/db/utils';

await applyDbMigrations();
await listen();
