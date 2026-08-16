import { FilePageModel } from './file-page';
import { FilePageChunkModel } from './file-page-chunk';
// airent imports
import { Awaitable, Select } from 'airent';

// entity imports
import { FilePageFieldRequest, FilePageResponse } from './file-page';
import { FilePageChunkFieldRequest, FilePageChunkResponse } from './file-page-chunk';

/** enums */

export enum FileType { PDF = 'PDF', EPUB = 'EPUB', TEXT = 'TEXT' };

/** structs */

export type AliasedFileModel = { id: string; size: number; tags: string[]; type: FileType; pages?: FilePageModel[]; chunks?: FilePageChunkModel[] };

export type AliasedFileFieldRequest = {
  size?: boolean;
  tags?: boolean;
  type?: boolean;
  chunks?: FilePageChunkFieldRequest;
};

export type AliasedFileResponse = {
  size?: number;
  tags?: string[];
  type?: FileType;
  chunks?: FilePageChunkResponse[];
};

export type SelectedAliasedFileResponse<S extends AliasedFileFieldRequest> = Select<AliasedFileResponse, S>;

export type AliasedFilePrimitiveField = 'size' | 'tags' | 'type' | 'id';
