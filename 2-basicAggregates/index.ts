import 'reflect-metadata';

import { WebServer } from './entrypoints/webServer/WebServer';
import { applyDbMigrations } from './infra/db/utils';

await applyDbMigrations();
await new WebServer().start();
