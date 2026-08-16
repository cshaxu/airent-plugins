import { AliasedFileModel } from './aliased-file';
import { FilePageChunkModel } from './file-page-chunk';
// airent imports
import { Awaitable, Select } from 'airent';

// entity imports
import { AliasedFileFieldRequest, AliasedFileResponse } from './aliased-file';
import { FilePageChunkFieldRequest, FilePageChunkResponse } from './file-page-chunk';

/** structs */

export type JsonValue = unknown;

export type FilePageModel = { id: string; createdAt: Date; updatedAt: Date; fileId: string; pageId: number; lines: JsonValue; file?: AliasedFileModel; chunks?: FilePageChunkModel[] };

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
  lines?: JsonValue;
  file?: AliasedFileResponse;
  chunks?: FilePageChunkResponse[];
};

export type SelectedFilePageResponse<S extends FilePageFieldRequest> = Select<FilePageResponse, S>;

export type FilePagePrimitiveField = 'id' | 'createdAt' | 'updatedAt' | 'fileId' | 'pageId' | 'lines';
