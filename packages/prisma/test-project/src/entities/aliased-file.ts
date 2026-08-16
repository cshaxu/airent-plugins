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
import { AliasedFile as PrismaAliasedFile } from '@prisma/client';
import { FileType as PrismaFileType } from '@prisma/client';
import { FilePageEntity } from './file-page';
import { FilePageChunkEntity } from './file-page-chunk';
import {
  AliasedFileFieldRequest,
  AliasedFileResponse,
  SelectedAliasedFileResponse,
  AliasedFileModel,
} from '../generated/types/aliased-file';
import { AliasedFileEntityBase } from '../generated/entities/aliased-file';

export class AliasedFileEntity extends AliasedFileEntityBase {
}
