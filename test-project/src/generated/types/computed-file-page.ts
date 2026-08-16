// library imports
import { Prisma } from '@prisma/client';
// airent imports
import { Awaitable, Select } from 'airent';

// entity imports
import { FilePageFieldRequest, FilePageResponse } from './file-page';

/** structs */

export type ComputedFilePage = { fileId: string; pageId: number };

export type ComputedFilePageModel = ComputedFilePage;

export type ComputedFilePageFieldRequest = {
  fileId?: boolean;
  pageId?: boolean;
  filePage?: FilePageFieldRequest;
};

export type ComputedFilePageResponse = {
  fileId?: string;
  pageId?: number;
  filePage?: FilePageResponse;
};

export type SelectedComputedFilePageResponse<S extends ComputedFilePageFieldRequest> = Select<ComputedFilePageResponse, S>;

export type ComputedFilePagePrimitiveField = 'fileId' | 'pageId';
