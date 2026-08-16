// library imports
import { headers as getHeaders } from 'next/headers';

// airent imports
import { toDecoded, toResult } from '../../../../src/index.js';

// config imports
import { baseUrl } from '../../config.js';
import { handlerConfig } from '../../framework.js';

// entity imports
import {
  UserFieldRequest,
  ManyUsersResponse,
  OneUserResponse,
} from '../types/user.js';
import UserDispatcher from '../dispatchers/user.js';
import {
  SearchUsersQuery,
  GetManyUsersQuery,
  GetOneUserParams,
  CreateOneUserBody,
  UpdateOneUserBody,
} from '../../api-types/user.js';

async function buildRequest(
  name: string,
  data: any,
): Promise<Request> {
  const input = `${baseUrl}/${name}`;
  const credentials = 'include' as RequestCredentials;
  const headers = await getHeaders();
  const body = JSON.stringify(data);
  const init = { credentials, method: 'POST', body, headers };
  return new Request(input, init);
}

async function search<S extends UserFieldRequest>(
  query: SearchUsersQuery,
  fieldRequest: S
): Promise<ManyUsersResponse<S>> {
  const data = { query: toDecoded(query), fieldRequest };
  const request = await buildRequest('search-users', data);
  const context = await handlerConfig.authenticator(request);
  return await UserDispatcher.search(data, context).then(toResult);
}

async function getMany<S extends UserFieldRequest>(
  query: GetManyUsersQuery,
  fieldRequest: S
): Promise<ManyUsersResponse<S>> {
  const data = { query: toDecoded(query), fieldRequest };
  const request = await buildRequest('get-many-users', data);
  const context = await handlerConfig.authenticator(request);
  return await UserDispatcher.getMany(data, context).then(toResult);
}

async function getOne<S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S
): Promise<OneUserResponse<S>> {
  const data = { params: toDecoded(params), fieldRequest };
  const request = await buildRequest('get-one-user', data);
  const context = await handlerConfig.authenticator(request);
  return await UserDispatcher.getOne(data, context).then(toResult);
}

async function getOneSafe<S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S
): Promise<OneUserResponse<S, true>> {
  const data = { params: toDecoded(params), fieldRequest };
  const request = await buildRequest('get-one-user-safe', data);
  const context = await handlerConfig.authenticator(request);
  return await UserDispatcher.getOneSafe(data, context).then(toResult);
}

async function createOne<S extends UserFieldRequest>(
  body: CreateOneUserBody,
  fieldRequest: S
): Promise<OneUserResponse<S>> {
  const data = { body, fieldRequest };
  const request = await buildRequest('create-one-user', data);
  const context = await handlerConfig.authenticator(request);
  return await UserDispatcher.createOne(data, context).then(toResult);
}

async function updateOne<S extends UserFieldRequest>(
  params: GetOneUserParams,
  body: UpdateOneUserBody,
  fieldRequest: S
): Promise<OneUserResponse<S>> {
  const data = { params: toDecoded(params), body, fieldRequest };
  const request = await buildRequest('update-one-user', data);
  const context = await handlerConfig.authenticator(request);
  return await UserDispatcher.updateOne(data, context).then(toResult);
}

async function deleteOne<S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S,
): Promise<OneUserResponse<S>> {
  const data = { params: toDecoded(params), fieldRequest };
  const request = await buildRequest('delete-one-user', data);
  const context = await handlerConfig.authenticator(request);
  return await UserDispatcher.deleteOne(data, context).then(toResult);
}

/** @deprecated */
const UserServerApiClient = {
  search,
  getMany,
  getOne,
  getOneSafe,
  createOne,
  updateOne,
  deleteOne,
};

export default UserServerApiClient;
