// library imports
import { Prisma } from '@prisma/client';
import { FilePageModel } from './file-page';
import { FilePageChunkModel } from './file-page-chunk';
// airent imports
import { Awaitable, Select } from 'airent';

// entity imports
import { AliasedFile as PrismaAliasedFile } from '@prisma/client';
import { FileType as PrismaFileType } from '@prisma/client';
import { FilePageFieldRequest, FilePageResponse } from './file-page';
import { FilePageChunkFieldRequest, FilePageChunkResponse } from './file-page-chunk';

/** structs */

export type AliasedFileModel = PrismaAliasedFile & { pages?: FilePageModel[]; chunks?: FilePageChunkModel[] };

export type AliasedFileFieldRequest = {
  size?: boolean;
  tags?: boolean;
  type?: boolean;
  chunks?: FilePageChunkFieldRequest;
};

export type AliasedFileResponse = {
  size?: number;
  tags?: string[];
  type?: PrismaFileType;
  chunks?: FilePageChunkResponse[];
};

export type SelectedAliasedFileResponse<S extends AliasedFileFieldRequest> = Select<AliasedFileResponse, S>;

export type AliasedFilePrimitiveField = 'size' | 'tags' | 'type' | 'id';
