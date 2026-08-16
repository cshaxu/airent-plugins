// airent imports
import { dispatchWith } from '@airent/api';
import { handleWith } from '../../../../../../src/index.js';

// config imports
import { Context } from '../../../../context.js';
import { dispatcherConfig } from '../../../../framework.js';
import { handlerConfig } from '../../../../framework.js';

// function imports
import { executor } from '../../../../cron/my-cron.js';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

const dispatcher = dispatchWith({
  ...dispatcherConfig,
  parser: () => Promise.resolve({}),
  executor: (_parsed: {}, context: Context) => executor(context),
  options: {},
});

export const GET = handleWith(dispatcher, handlerConfig);
