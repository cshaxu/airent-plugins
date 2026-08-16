// airent imports
import {
  AsyncLock,
  Awaitable,
  LoadConfig,
  LoadKey,
  Select,
  batch,
  clone,
  sequential,
  toArrayMap,
  toObjectMap,
} from 'airent';

// config imports
import { Context } from '../context';

// entity imports
import { FilePageEntity } from './file-page';
import {
  ComputedFilePageFieldRequest,
  ComputedFilePageResponse,
  SelectedComputedFilePageResponse,
  ComputedFilePage,
  ComputedFilePageModel,
} from '../generated/types/computed-file-page';
import { ComputedFilePageEntityBase } from '../generated/entities/computed-file-page';

export class ComputedFilePageEntity extends ComputedFilePageEntityBase {
}
