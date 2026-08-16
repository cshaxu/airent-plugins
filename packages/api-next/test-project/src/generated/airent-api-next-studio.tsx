import {
  buildAirentApiNextStudioCatalog,
} from '../../../src/index';
import AirentApiNextStudioView from '@airent/api-next/studio-view';
import {
  SearchUsersQuery,
  GetManyUsersQuery,
  GetOneUserParams,
  CreateOneUserBody,
  UpdateOneUserBody,
} from '../api-types/user.js';
import * as MyDebugDebugEndpoint from '../debug/my-debug';
import * as MyWebhookWebhookEndpoint from '../webhooks/my-webhook';
import * as MyCronCronEndpoint from '../cron/my-cron';

const entityEndpoints = [
  {
    id: 'user.js.search',
    label: 'Search users',
    entityName: 'User',
    operation: 'search',
    path: '/api/airent/search-users',
    method: 'POST',
    querySchema: SearchUsersQuery,
    fieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
      'messages',
    ],
    primitiveFieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
    ],
  },
  {
    id: 'user.js.getMany',
    label: 'Get Many users',
    entityName: 'User',
    operation: 'getMany',
    path: '/api/airent/get-many-users',
    method: 'POST',
    querySchema: GetManyUsersQuery,
    fieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
      'messages',
    ],
    primitiveFieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
    ],
  },
  {
    id: 'user.js.getOne',
    label: 'Get One User',
    entityName: 'User',
    operation: 'getOne',
    path: '/api/airent/get-one-user.js',
    method: 'POST',
    paramsSchema: GetOneUserParams,
    fieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
      'messages',
    ],
    primitiveFieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
    ],
  },
  {
    id: 'user.js.getOneSafe',
    label: 'Get One Safe User',
    entityName: 'User',
    operation: 'getOneSafe',
    path: '/api/airent/get-one-user.js-safe',
    method: 'POST',
    paramsSchema: GetOneUserParams,
    fieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
      'messages',
    ],
    primitiveFieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
    ],
  },
  {
    id: 'user.js.createOne',
    label: 'Create One User',
    entityName: 'User',
    operation: 'createOne',
    path: '/api/airent/create-one-user.js',
    method: 'POST',
    bodySchema: CreateOneUserBody,
    fieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
      'messages',
    ],
    primitiveFieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
    ],
  },
  {
    id: 'user.js.updateOne',
    label: 'Update One User',
    entityName: 'User',
    operation: 'updateOne',
    path: '/api/airent/update-one-user.js',
    method: 'POST',
    paramsSchema: GetOneUserParams,
    bodySchema: UpdateOneUserBody,
    fieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
      'messages',
    ],
    primitiveFieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
    ],
  },
  {
    id: 'user.js.deleteOne',
    label: 'Delete One User',
    entityName: 'User',
    operation: 'deleteOne',
    path: '/api/airent/delete-one-user.js',
    method: 'POST',
    paramsSchema: GetOneUserParams,
    fieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
      'messages',
    ],
    primitiveFieldRequestFields: [
      'id',
      'createdAt',
      'name',
      'email',
    ],
  },
] as const;

const debugEndpoints = [
  {
    id: 'debug.my-debug',
    label: 'my-debug',
    path: '/api/debug/my-debug',
    method: 'POST',
    auth: 'internal',
    bodySchema: MyDebugDebugEndpoint.Params ?? null,
  },
] as const;

const webhookEndpoints = [
  {
    id: 'webhook.my-webhook',
    label: 'my-webhook',
    path: '/api/webhooks/my-webhook',
    method: 'POST',
    auth: 'headers',
    bodySchema: MyWebhookWebhookEndpoint.Params ?? null,
    hasCustomAuthorizer: typeof MyWebhookWebhookEndpoint.authorizer === 'function',
  },
] as const;

const cronEndpoints = [
  {
    id: 'cron.my-cron',
    label: 'my-cron',
    path: '/api/cron/my-cron',
    method: 'GET',
    auth: 'cron',
    schedule: MyCronCronEndpoint.schedule ?? null,
    maxDuration: MyCronCronEndpoint.maxDuration ?? null,
  },
] as const;

const groups = buildAirentApiNextStudioCatalog({
  entities: entityEndpoints,
  debug: debugEndpoints,
  webhook: webhookEndpoints,
  cron: cronEndpoints,
});

export function AirentApiNextStudio() {
  return <AirentApiNextStudioView groups={groups} />;
}

export default AirentApiNextStudio;
