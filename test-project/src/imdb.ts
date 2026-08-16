import { createInMemoryDatabase } from "../../src";
import {
  AliasedFileModel,
  FileType,
} from "./generated/types/aliased-file";
import { FilePageChunkModel } from "./generated/types/file-page-chunk";
import { FilePageModel } from "./generated/types/file-page";

const now = new Date("2026-03-22T00:00:00.000Z");

const imdb = createInMemoryDatabase<{
  aliasedFile: AliasedFileModel;
  filePage: FilePageModel;
  filePageChunk: FilePageChunkModel;
}>({
  aliasedFile: [
    {
      id: "file-1",
      size: 2048,
      tags: ["sample", "imdb"],
      type: FileType.PDF,
    },
  ],
  filePage: [
    {
      id: "page-1",
      createdAt: now,
      updatedAt: now,
      fileId: "file-1",
      pageId: 1,
      lines: ["Line 1", "Line 2"],
    },
  ],
  filePageChunk: [
    {
      id: "chunk-1",
      createdAt: now,
      updatedAt: now,
      fileId: "file-1",
      pageId: 1,
      chunkId: 1,
      startLineId: 1,
      endLineId: 2,
    },
  ],
});

export default imdb;
