// airent imports
import { bodyRequestParser, handleWith } from '../../../../src/index.js';

// config imports
import { handlerConfig as handlerConfigRaw } from '../../framework.js';

// entity imports
import UserDispatcher from '../dispatchers/user.js';

const handlerConfig = { ...handlerConfigRaw, requestParser: bodyRequestParser };

const search = handleWith(UserDispatcher.search, handlerConfig);

const getMany = handleWith(UserDispatcher.getMany, handlerConfig);

const getOne = handleWith(UserDispatcher.getOne, handlerConfig);

const getOneSafe = handleWith(UserDispatcher.getOneSafe, handlerConfig);

const createOne = handleWith(UserDispatcher.createOne, handlerConfig);

const updateOne = handleWith(UserDispatcher.updateOne, handlerConfig);

const deleteOne = handleWith(UserDispatcher.deleteOne, handlerConfig);

/** @deprecated */
const UserHandler = {
  search,
  getMany,
  getOne,
  getOneSafe,
  createOne,
  updateOne,
  deleteOne,
};

export default UserHandler;
