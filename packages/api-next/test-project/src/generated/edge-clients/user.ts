// entity imports
import { UserFieldRequest } from '../types/user.js';
import {
  SearchUsersQuery,
  GetManyUsersQuery,
  GetOneUserParams,
  CreateOneUserBody,
  UpdateOneUserBody,
} from '../../api-types/user.js';
import UserApiClient from '../clients/user.js';

const search = <S extends UserFieldRequest>(
  query: SearchUsersQuery,
  fieldRequest: S,
  headers: Headers
) => UserApiClient.search(query, fieldRequest, { headers });

const getMany = <S extends UserFieldRequest>(
  query: GetManyUsersQuery,
  fieldRequest: S,
  headers: Headers
) => UserApiClient.getMany(query, fieldRequest, { headers });

const getOne = <S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S,
  headers: Headers
) => UserApiClient.getOne(params, fieldRequest, { headers });

const getOneSafe = <S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S,
  headers: Headers
) => UserApiClient.getOneSafe(params, fieldRequest, { headers });

const createOne = <S extends UserFieldRequest>(
  body: CreateOneUserBody,
  fieldRequest: S,
  headers: Headers
) => UserApiClient.createOne(body, fieldRequest, { headers });

const updateOne = <S extends UserFieldRequest>(
  params: GetOneUserParams,
  body: UpdateOneUserBody,
  fieldRequest: S,
  headers: Headers
) => UserApiClient.updateOne(params, body, fieldRequest, { headers });

const deleteOne = <S extends UserFieldRequest>(
  params: GetOneUserParams,
  fieldRequest: S,
  headers: Headers
) => UserApiClient.deleteOne(params, fieldRequest, { headers });

/** @deprecated */
const UserEdgeApiClient = {
  search,
  getMany,
  getOne,
  getOneSafe,
  createOne,
  updateOne,
  deleteOne,
};

export default UserEdgeApiClient;
