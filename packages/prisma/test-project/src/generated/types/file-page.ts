// library imports
import { Prisma } from '@prisma/client';
import { AliasedFileModel } from './aliased-file';
import { FilePageChunkModel } from './file-page-chunk';
// airent imports
import { Awaitable, Select } from 'airent';

// entity imports
import { FilePage as PrismaFilePage } from '@prisma/client';
import { AliasedFileFieldRequest, AliasedFileResponse } from './aliased-file';
import { FilePageChunkFieldRequest, FilePageChunkResponse } from './file-page-chunk';

/** structs */

export type PrismaJsonValue = Prisma.JsonValue;

export type FilePageModel = PrismaFilePage & { file?: AliasedFileModel; chunks?: FilePageChunkModel[] };

export type FilePageFieldRequest = {
  id?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  fileId?: boolean;
  pageId?: boolean;
  lines?: boolean;
  file?: AliasedFileFieldRequest;
  chunks?: FilePageChunkFieldRequest;
};

export type FilePageResponse = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fileId?: string;
  pageId?: number;
  lines?: PrismaJsonValue;
  file?: AliasedFileResponse;
  chunks?: FilePageChunkResponse[];
};

export type SelectedFilePageResponse<S extends FilePageFieldRequest> = Select<FilePageResponse, S>;

export type FilePagePrimitiveField = 'id' | 'createdAt' | 'updatedAt' | 'fileId' | 'pageId' | 'lines';
