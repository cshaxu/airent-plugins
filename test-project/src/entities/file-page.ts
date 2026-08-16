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
import { FilePage as PrismaFilePage } from '@prisma/client';
import { AliasedFileEntity } from './aliased-file';
import { FilePageChunkEntity } from './file-page-chunk';
import {
  FilePageFieldRequest,
  FilePageResponse,
  SelectedFilePageResponse,
  PrismaJsonValue,
  FilePageModel,
} from '../generated/types/file-page';
import { FilePageEntityBase } from '../generated/entities/file-page';

export class FilePageEntity extends FilePageEntityBase {
}
