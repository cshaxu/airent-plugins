import { AliasedFileModel } from './aliased-file';
import { FilePageModel } from './file-page';
// airent imports
import { Awaitable, Select } from 'airent';

// entity imports
import { AliasedFileFieldRequest, AliasedFileResponse } from './aliased-file';
import { FilePageFieldRequest, FilePageResponse } from './file-page';

/** structs */

export type FilePageChunkModel = { id: string; createdAt: Date; updatedAt: Date; fileId: string; pageId: number; chunkId: number; startLineId: number; endLineId: number; file?: AliasedFileModel; page?: FilePageModel };

export type FilePageChunkFieldRequest = {
  id?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  fileId?: boolean;
  pageId?: boolean;
  chunkId?: boolean;
  startLineId?: boolean;
  endLineId?: boolean;
  file?: AliasedFileFieldRequest;
  page?: FilePageFieldRequest;
};

export type FilePageChunkResponse = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fileId?: string;
  pageId?: number;
  chunkId?: number;
  startLineId?: number;
  endLineId?: number;
  file?: AliasedFileResponse;
  page?: FilePageResponse;
};

export type SelectedFilePageChunkResponse<S extends FilePageChunkFieldRequest> = Select<FilePageChunkResponse, S>;

export type FilePageChunkPrimitiveField = 'id' | 'createdAt' | 'updatedAt' | 'fileId' | 'pageId' | 'chunkId' | 'startLineId' | 'endLineId';
