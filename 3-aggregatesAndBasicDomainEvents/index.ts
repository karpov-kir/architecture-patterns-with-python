import 'reflect-metadata';

import { CompositionRoot } from './entrypoints/webServer/CompositionRoot';
import { applyDbMigrations } from './infra/db/utils';

await applyDbMigrations();

const compositionRoot = await CompositionRoot.create();

await compositionRoot.start();
