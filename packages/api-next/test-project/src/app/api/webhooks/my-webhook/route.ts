// airent imports
import { dispatchWith } from '@airent/api';
import { handleWith } from '../../../../../../src/index.js';

// config imports
import { dispatcherConfig } from '../../../../framework.js';
import { handlerConfig } from '../../../../framework.js';

// function imports
import { parser, authorizer, executor } from '../../../../webhooks/my-webhook.js';

const dispatcher = dispatchWith({
  ...dispatcherConfig,
  authorizer,
  parser,
  executor,
});

export const POST = handleWith(dispatcher, handlerConfig);
