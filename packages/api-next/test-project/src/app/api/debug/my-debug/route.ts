// airent imports
import { dispatchWith } from '@airent/api';
import { handleWith } from '../../../../../../src/index.js';

// config imports
import { dispatcherConfig } from '../../../../framework.js';
import { handlerConfig } from '../../../../framework.js';

// function imports
import { parser, executor } from '../../../../debug/my-debug.js';

const dispatcher = dispatchWith({
  ...dispatcherConfig,
  parser,
  executor,
});

export const POST = handleWith(dispatcher, handlerConfig);
