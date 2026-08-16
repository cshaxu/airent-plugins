// library imports
import { unstable_cache } from 'next/cache';

// airent imports
import { NextCacheOptions, toDecoded, toResult } from '../../../../src/index.js';

// config imports
import { Context } from '../../context.js';

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

async function search<S extends UserFieldRequest>(
  query: SearchUsersQuery,
  fieldRequest: S,
  context: Context,
  options?: NextCacheOptions
): Promise<ManyUsersResponse<S>> {
  const data = { query: toDecoded(query), fieldRequest };
  const cacheKey = [
    'users',
    'search',
    JSON.stringify(data),
    JSON.stringify(context),
  ];
  const callback = () => UserDispatcher.search(data, context).then(toResult);
  return await unstable_cache(callback, cacheKey, options)();
}

async function getMany<S extends UserFieldRequest>(
  query: GetManyUsersQuery,
  fieldRequest: S,
  context: Context,
  options?: NextCacheOptions
): Promise<ManyUsersResponse<S>> {
  const data = { query: toDecoded(query), fieldRequest };
  const cacheKey = [
    'users',
    'getMany',
    JSON.stringify(data),
    JSON.stringify(context),
  ];
  const callback = () => UserDispatcher.getMany(data, context).then(toResult);
  return await unstable_cache(callback, cacheKey, options)();
}

async function getOne<S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S,
  context: Context,
  options?: NextCacheOptions
): Promise<OneUserResponse<S>> {
  const data = { params: toDecoded(params), fieldRequest };
  const cacheKey = [
    'users',
    'getOne',
    JSON.stringify(data),
    JSON.stringify(context),
  ];
  const callback = () => UserDispatcher.getOne(data, context).then(toResult);
  return await unstable_cache(callback, cacheKey, options)();
}

async function getOneSafe<S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S,
  context: Context,
  options?: NextCacheOptions
): Promise<OneUserResponse<S, true>> {
  const data = { params: toDecoded(params), fieldRequest };
  const cacheKey = [
    'users',
    'getOneSafe',
    JSON.stringify(data),
    JSON.stringify(context),
  ];
  const callback = () => UserDispatcher.getOneSafe(data, context).then(toResult);
  return await unstable_cache(callback, cacheKey, options)();
}

async function createOne<S extends UserFieldRequest>(
  body: CreateOneUserBody,
  fieldRequest: S,
  context: Context,
  options?: NextCacheOptions
): Promise<OneUserResponse<S>> {
  const data = { body, fieldRequest };
  const cacheKey = [
    'users',
    'createOne',
    JSON.stringify(data),
    JSON.stringify(context),
  ];
  const callback = () => UserDispatcher.createOne(data, context).then(toResult);
  return await unstable_cache(callback, cacheKey, options)();
}

async function updateOne<S extends UserFieldRequest>(
  params: GetOneUserParams,
  body: UpdateOneUserBody,
  fieldRequest: S,
  context: Context,
  options?: NextCacheOptions
): Promise<OneUserResponse<S>> {
  const data = { params: toDecoded(params), body, fieldRequest };
  const cacheKey = [
    'users',
    'updateOne',
    JSON.stringify(data),
    JSON.stringify(context),
  ];
  const callback = () => UserDispatcher.updateOne(data, context).then(toResult);
  return await unstable_cache(callback, cacheKey, options)();
}

async function deleteOne<S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S,
  context: Context,
  options?: NextCacheOptions
): Promise<OneUserResponse<S>> {
  const data = { params: toDecoded(params), fieldRequest };
  const cacheKey = [
    'users',
    'deleteOne',
    JSON.stringify(data),
    JSON.stringify(context),
  ];
  const callback = () => UserDispatcher.deleteOne(data, context).then(toResult);
  return await unstable_cache(callback, cacheKey, options)();
}

/** @deprecated */
const UserCachedServerApiClient = {
  search,
  getMany,
  getOne,
  getOneSafe,
  createOne,
  updateOne,
  deleteOne,
};

export default UserCachedServerApiClient;
