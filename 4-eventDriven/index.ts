import 'reflect-metadata';

import { CompositionRoot } from './entrypoints/CompositionRoot';
import { applyDbMigrations } from './infra/db/utils';

await applyDbMigrations();

const compositionRoot = await CompositionRoot.create();

await compositionRoot.start();
