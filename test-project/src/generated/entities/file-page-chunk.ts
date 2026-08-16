// library imports
import { Prisma } from '@prisma/client';
// airent imports
import { ValidatePrismaArgs, batchLoad, batchLoadTopMany, entityCompare } from '../../../../src/index';
// config imports
import prisma from '../../prisma';
// entity imports
import { FilePageChunkPrimitiveField } from '../types/file-page-chunk';
import { AliasedFileModel } from '../types/aliased-file';
import { FilePageModel } from '../types/file-page';
// airent imports
import {
  AsyncLock,
  Awaitable,
  BaseEntity,
  EntityConstructor,
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
import { Context } from '../../context';

// entity imports
import { FilePageChunk as PrismaFilePageChunk } from '@prisma/client';
import { AliasedFileEntity } from '../../entities/aliased-file';
import { FilePageEntity } from '../../entities/file-page';
import {
  FilePageChunkFieldRequest,
  FilePageChunkResponse,
  SelectedFilePageChunkResponse,
  FilePageChunkModel,
} from '../types/file-page-chunk';

export class FilePageChunkEntityBase extends BaseEntity<
  FilePageChunkModel, Context, FilePageChunkFieldRequest, FilePageChunkResponse
> {
  public id!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public fileId!: string;
  public pageId!: number;
  public chunkId!: number;
  public startLineId!: number;
  public endLineId!: number;

  protected file?: AliasedFileEntity;

  protected page?: FilePageEntity;

  public constructor(
    model: FilePageChunkModel,
    context: Context,
    group: FilePageChunkEntityBase[],
    lock: AsyncLock,
  ) {
    super(context, group, lock);
    this._aliasMapFromModel['id'] = 'id';
    this._aliasMapToModel['id'] = 'id';
    this._aliasMapFromModel['createdAt'] = 'createdAt';
    this._aliasMapToModel['createdAt'] = 'createdAt';
    this._aliasMapFromModel['updatedAt'] = 'updatedAt';
    this._aliasMapToModel['updatedAt'] = 'updatedAt';
    this._aliasMapFromModel['fileId'] = 'fileId';
    this._aliasMapToModel['fileId'] = 'fileId';
    this._aliasMapFromModel['pageId'] = 'pageId';
    this._aliasMapToModel['pageId'] = 'pageId';
    this._aliasMapFromModel['chunkId'] = 'chunkId';
    this._aliasMapToModel['chunkId'] = 'chunkId';
    this._aliasMapFromModel['startLineId'] = 'startLineId';
    this._aliasMapToModel['startLineId'] = 'startLineId';
    this._aliasMapFromModel['endLineId'] = 'endLineId';
    this._aliasMapToModel['endLineId'] = 'endLineId';
    this.fromModelInner(model, true);
    this.initialize(model, context);
  }

  /** mutators */

  public async reload(): Promise<this> {
    const one = await FilePageChunkEntityBase.findUniqueOrThrow({
      where: {
        id: this.id,
      },
    }, this.context);
    const model = one.toModel();
    this.fromModelInner(model, true);
    return this;
  }

  public async save(): Promise<this> {
    const dirtyModel = this.toDirtyModel();
    if (Object.keys(dirtyModel).length === 0) {
      return this;
    }
    const one = await FilePageChunkEntityBase.update({
      where: {
        id: this.id,
      },
      data: dirtyModel as Prisma.FilePageChunkUncheckedUpdateInput,
    }, this.context);
    const model = one.toModel();
    this.fromModelInner(model, true);
    return this;
  }

  public async delete(): Promise<this> {
    const one = await FilePageChunkEntityBase.delete({
      where: {
        id: this.id,
      },
    }, this.context);
    const model = one.toModel();
    this.fromModelInner(model, true);
    return this;
  }

  public async present<S extends FilePageChunkFieldRequest>(fieldRequest: S): Promise<SelectedFilePageChunkResponse<S>> {
    await this.beforePresent(fieldRequest);
    const response = {
      ...(fieldRequest.id !== undefined && { id: this.id }),
      ...(fieldRequest.createdAt !== undefined && { createdAt: this.createdAt }),
      ...(fieldRequest.updatedAt !== undefined && { updatedAt: this.updatedAt }),
      ...(fieldRequest.fileId !== undefined && { fileId: this.fileId }),
      ...(fieldRequest.pageId !== undefined && { pageId: this.pageId }),
      ...(fieldRequest.chunkId !== undefined && { chunkId: this.chunkId }),
      ...(fieldRequest.startLineId !== undefined && { startLineId: this.startLineId }),
      ...(fieldRequest.endLineId !== undefined && { endLineId: this.endLineId }),
      ...(fieldRequest.file !== undefined && { file: await this.getFile().then((one) => one.present(fieldRequest.file!)) }),
      ...(fieldRequest.page !== undefined && { page: await this.getPage().then((one) => one.present(fieldRequest.page!)) }),
    };
    await this.afterPresent(fieldRequest, response as Select<FilePageChunkResponse, S>);
    return response as SelectedFilePageChunkResponse<S>;
  }

  public static async presentMany<
    ENTITY extends FilePageChunkEntityBase,
    S extends FilePageChunkFieldRequest
  >(entities: ENTITY[], fieldRequest: S): Promise<SelectedFilePageChunkResponse<S>[]> {
    return await sequential(entities.map((one) => () => one.present(fieldRequest)));
  }

  /** self creator */

  public static async createOne<ENTITY extends FilePageChunkEntityBase>(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    model: Partial<FilePageChunkModel>,
    context: Context
  ): Promise<ENTITY> {
    const one = await FilePageChunkEntityBase.create({
      data: model as Prisma.FilePageChunkUncheckedCreateInput,
    }, context);
    const createdModel = one.toModel();
    return (this as any).fromOne(createdModel, context);
  }

  /** associations */

  protected fileLoadConfig: LoadConfig<FilePageChunkEntityBase, AliasedFileEntity> = {
    name: 'FilePageChunkEntity.file',
    filter: (one: FilePageChunkEntityBase) => one.file === undefined,
    getter: (sources: FilePageChunkEntityBase[]) => {
      return sources
        .map((one) => ({
          id: one.fileId,
        }));
    },
    loader: async (keys: LoadKey[]) => {
      const models = await batchLoad(prisma.aliasedFile.findMany, keys, 1234);
      return AliasedFileEntity.fromArray(models, this.context);
    },
    setter: (sources: FilePageChunkEntityBase[], targets: AliasedFileEntity[]) => {
      const map = toObjectMap(targets, (one) => JSON.stringify({ id: one.id }));
      sources.forEach((one) => (one.file = map.get(JSON.stringify({ id: one.fileId }))!));
    },
  };

  public async getFile(): Promise<AliasedFileEntity> {
    if (this.file !== undefined) {
      return this.file;
    }
    await this.load(this.fileLoadConfig);
    return this.file!;
  }

  public setFile(file?: AliasedFileEntity): void {
    this.file = file;
  }

  protected pageLoadConfig: LoadConfig<FilePageChunkEntityBase, FilePageEntity> = {
    name: 'FilePageChunkEntity.page',
    filter: (one: FilePageChunkEntityBase) => one.page === undefined,
    getter: (sources: FilePageChunkEntityBase[]) => {
      return sources
        .map((one) => ({
          fileId: one.fileId,
          pageId: one.pageId,
        }));
    },
    loader: async (keys: LoadKey[]) => {
      const models = await batchLoad(prisma.filePage.findMany, keys, 1234);
      return FilePageEntity.fromArray(models, this.context);
    },
    setter: (sources: FilePageChunkEntityBase[], targets: FilePageEntity[]) => {
      const map = toObjectMap(targets, (one) => JSON.stringify({ fileId: one.fileId, pageId: one.pageId }));
      sources.forEach((one) => (one.page = map.get(JSON.stringify({ fileId: one.fileId, pageId: one.pageId }))!));
    },
  };

  public async getPage(): Promise<FilePageEntity> {
    if (this.page !== undefined) {
      return this.page;
    }
    await this.load(this.pageLoadConfig);
    return this.page!;
  }

  public setPage(page?: FilePageEntity): void {
    this.page = page;
  }

  protected initialize(model: FilePageChunkModel, context: Context): void {
    if (model.file !== undefined) {
      this.file = AliasedFileEntity.fromOne(model.file, context);
    }
    if (model.page !== undefined) {
      this.page = FilePageEntity.fromOne(model.page, context);
    }
  }

  /** prisma wrappers */

  public static count = prisma.filePageChunk.count;

  public static aggregate = prisma.filePageChunk.aggregate;

  public static groupBy = prisma.filePageChunk.groupBy;

  public static createMany = prisma.filePageChunk.createMany;

  public static updateMany = prisma.filePageChunk.updateMany;

  public static deleteMany = prisma.filePageChunk.deleteMany;

  public static async findMany<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkFindManyArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkFindManyArgs>,
    context: Context,
  ): Promise<ENTITY[]> {
    const models = await prisma.filePageChunk.findMany(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkFindManyArgs>
    );
    const many = (this as any).fromArray(models, context);
    return many;
  }

  public static async findUnique<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkFindUniqueArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkFindUniqueArgs>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await prisma.filePageChunk.findUnique(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkFindUniqueArgs>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findFirst<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkFindFirstArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkFindFirstArgs>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await prisma.filePageChunk.findFirst(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkFindFirstArgs>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findUniqueOrThrow<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkFindUniqueOrThrowArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkFindUniqueOrThrowArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const model = await prisma.filePageChunk.findUniqueOrThrow(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkFindUniqueOrThrowArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findFirstOrThrow<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkFindFirstOrThrowArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkFindFirstOrThrowArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const model = await prisma.filePageChunk.findFirstOrThrow(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkFindFirstOrThrowArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  protected static beforeCreate<ENTITY extends FilePageChunkEntityBase>(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    _context: Context
  ): Awaitable<void> {}

  protected static afterCreate<ENTITY extends FilePageChunkEntityBase>(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    _one: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  public static async create<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkCreateArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkCreateArgs>,
    context: Context,
  ): Promise<ENTITY> {
    await (this as any).beforeCreate(context);
    const model = await prisma.filePageChunk.create(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkCreateArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    await (this as any).afterCreate(one, context);
    return one;
  }

  protected static PRIMITIVE_FIELDS: FilePageChunkPrimitiveField[] = [
    'id',
    'createdAt',
    'updatedAt',
    'fileId',
    'pageId',
    'chunkId',
    'startLineId',
    'endLineId',
  ];

  protected static beforeUpdate<ENTITY extends FilePageChunkEntityBase>(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  protected static afterUpdate<ENTITY extends FilePageChunkEntityBase>(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _oneAfter: ENTITY,
    _updatedFields: FilePageChunkPrimitiveField[],
    _context: Context
  ): Awaitable<void> {}

  public static async update<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkUpdateArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkUpdateArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUniqueOrThrow(
      { where: args.where },
      context
    ) as ENTITY;
    await (this as any).beforeUpdate(oneBefore, context);
    const model = await prisma.filePageChunk.update(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkUpdateArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    const updatedFields = entityCompare(
      oneBefore,
      one,
      (this as any).PRIMITIVE_FIELDS
    );
    await (this as any).afterUpdate(oneBefore, one, updatedFields, context);
    return one;
  }

  protected static beforeDelete<ENTITY extends FilePageChunkEntityBase>(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  protected static afterDelete<ENTITY extends FilePageChunkEntityBase>(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  public static async delete<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkDeleteArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkDeleteArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUniqueOrThrow(
      { where: args.where },
      context
    ) as ENTITY;
    await (this as any).beforeDelete(oneBefore, context);
    const model = await prisma.filePageChunk.delete(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkDeleteArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    await (this as any).afterDelete(oneBefore, context);
    return one;
  }

  public static async upsert<
    ENTITY extends FilePageChunkEntityBase,
    T extends Prisma.FilePageChunkUpsertArgs,
  >(
    this: EntityConstructor<FilePageChunkModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageChunkUpsertArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUnique(
      { where: args.where },
      context
    ) as ENTITY;
    if (oneBefore === null) {
      await (this as any).beforeCreate(context);
    } else {
      await (this as any).beforeUpdate(oneBefore, context);
    }
    const model = await prisma.filePageChunk.upsert(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageChunkUpsertArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    if (oneBefore === null) {
      await (this as any).afterCreate(one, context);
    } else {
      const updatedFields = entityCompare(
        oneBefore,
        one,
        (this as any).PRIMITIVE_FIELDS
      );
      await (this as any).afterUpdate(oneBefore, one, updatedFields, context);
    }
    return one;
  }
}
