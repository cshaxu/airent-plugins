// library imports
import { Prisma } from '@prisma/client';
// airent imports
import { ValidatePrismaArgs, batchLoad, batchLoadTopMany, entityCompare } from '../../../../src/index';
// config imports
import prisma from '../../prisma';
// entity imports
import { FilePagePrimitiveField } from '../types/file-page';
import { AliasedFileModel } from '../types/aliased-file';
import { FilePageChunkModel } from '../types/file-page-chunk';
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
import { FilePage as PrismaFilePage } from '@prisma/client';
import { AliasedFileEntity } from '../../entities/aliased-file';
import { FilePageChunkEntity } from '../../entities/file-page-chunk';
import {
  FilePageFieldRequest,
  FilePageResponse,
  SelectedFilePageResponse,
  PrismaJsonValue,
  FilePageModel,
} from '../types/file-page';

export class FilePageEntityBase extends BaseEntity<
  FilePageModel, Context, FilePageFieldRequest, FilePageResponse
> {
  public id!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public fileId!: string;
  public pageId!: number;
  public lines!: PrismaJsonValue;

  protected file?: AliasedFileEntity;

  protected chunks?: FilePageChunkEntity[];

  public constructor(
    model: FilePageModel,
    context: Context,
    group: FilePageEntityBase[],
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
    this._aliasMapFromModel['lines'] = 'lines';
    this._aliasMapToModel['lines'] = 'lines';
    this.fromModelInner(model, true);
    this.initialize(model, context);
  }

  /** mutators */

  public async reload(): Promise<this> {
    const one = await FilePageEntityBase.findUniqueOrThrow({
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
    const one = await FilePageEntityBase.update({
      where: {
        id: this.id,
      },
      data: dirtyModel as Prisma.FilePageUncheckedUpdateInput,
    }, this.context);
    const model = one.toModel();
    this.fromModelInner(model, true);
    return this;
  }

  public async delete(): Promise<this> {
    const one = await FilePageEntityBase.delete({
      where: {
        id: this.id,
      },
    }, this.context);
    const model = one.toModel();
    this.fromModelInner(model, true);
    return this;
  }

  public async present<S extends FilePageFieldRequest>(fieldRequest: S): Promise<SelectedFilePageResponse<S>> {
    await this.beforePresent(fieldRequest);
    const response = {
      ...(fieldRequest.id !== undefined && { id: this.id }),
      ...(fieldRequest.createdAt !== undefined && { createdAt: this.createdAt }),
      ...(fieldRequest.updatedAt !== undefined && { updatedAt: this.updatedAt }),
      ...(fieldRequest.fileId !== undefined && { fileId: this.fileId }),
      ...(fieldRequest.pageId !== undefined && { pageId: this.pageId }),
      ...(fieldRequest.lines !== undefined && { lines: this.lines }),
      ...(fieldRequest.file !== undefined && { file: await this.getFile().then((one) => one.present(fieldRequest.file!)) }),
      ...(fieldRequest.chunks !== undefined && { chunks: await this.getChunks().then((a) => Promise.all(a.map((one) => one.present(fieldRequest.chunks!)))) }),
    };
    await this.afterPresent(fieldRequest, response as Select<FilePageResponse, S>);
    return response as SelectedFilePageResponse<S>;
  }

  public static async presentMany<
    ENTITY extends FilePageEntityBase,
    S extends FilePageFieldRequest
  >(entities: ENTITY[], fieldRequest: S): Promise<SelectedFilePageResponse<S>[]> {
    return await sequential(entities.map((one) => () => one.present(fieldRequest)));
  }

  /** self creator */

  public static async createOne<ENTITY extends FilePageEntityBase>(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    model: Partial<FilePageModel>,
    context: Context
  ): Promise<ENTITY> {
    const one = await FilePageEntityBase.create({
      data: model as Prisma.FilePageUncheckedCreateInput,
    }, context);
    const createdModel = one.toModel();
    return (this as any).fromOne(createdModel, context);
  }

  /** associations */

  protected fileLoadConfig: LoadConfig<FilePageEntityBase, AliasedFileEntity> = {
    name: 'FilePageEntity.file',
    filter: (one: FilePageEntityBase) => one.file === undefined,
    getter: (sources: FilePageEntityBase[]) => {
      return sources
        .map((one) => ({
          id: one.fileId,
        }));
    },
    loader: async (keys: LoadKey[]) => {
      const models = await batchLoad(prisma.aliasedFile.findMany, keys, 1234);
      return AliasedFileEntity.fromArray(models, this.context);
    },
    setter: (sources: FilePageEntityBase[], targets: AliasedFileEntity[]) => {
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

  protected chunksLoadConfig: LoadConfig<FilePageEntityBase, FilePageChunkEntity> = {
    name: 'FilePageEntity.chunks',
    filter: (one: FilePageEntityBase) => one.chunks === undefined,
    getter: (sources: FilePageEntityBase[]) => {
      return sources
        .map((one) => ({
          fileId: one.fileId,
          pageId: one.pageId,
        }));
    },
    loader: async (keys: LoadKey[]) => {
      const models = await batchLoad(prisma.filePageChunk.findMany, keys, 1234);
      return FilePageChunkEntity.fromArray(models, this.context);
    },
    setter: (sources: FilePageEntityBase[], targets: FilePageChunkEntity[]) => {
      const map = toArrayMap(targets, (one) => JSON.stringify({ fileId: one.fileId, pageId: one.pageId }));
      sources.forEach((one) => (one.chunks = map.get(JSON.stringify({ fileId: one.fileId, pageId: one.pageId })) ?? []));
    },
  };

  public async getChunks(): Promise<FilePageChunkEntity[]> {
    if (this.chunks !== undefined) {
      return this.chunks;
    }
    await this.load(this.chunksLoadConfig);
    return this.chunks!;
  }

  public setChunks(chunks?: FilePageChunkEntity[]): void {
    this.chunks = chunks;
  }

  protected initialize(model: FilePageModel, context: Context): void {
    if (model.file !== undefined) {
      this.file = AliasedFileEntity.fromOne(model.file, context);
    }
    if (model.chunks !== undefined) {
      this.chunks = FilePageChunkEntity.fromArray(model.chunks, context);
    }
  }

  /** prisma wrappers */

  public static count = prisma.filePage.count;

  public static aggregate = prisma.filePage.aggregate;

  public static groupBy = prisma.filePage.groupBy;

  public static createMany = prisma.filePage.createMany;

  public static updateMany = prisma.filePage.updateMany;

  public static deleteMany = prisma.filePage.deleteMany;

  public static async findMany<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageFindManyArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageFindManyArgs>,
    context: Context,
  ): Promise<ENTITY[]> {
    const models = await prisma.filePage.findMany(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageFindManyArgs>
    );
    const many = (this as any).fromArray(models, context);
    return many;
  }

  public static async findUnique<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageFindUniqueArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageFindUniqueArgs>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await prisma.filePage.findUnique(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageFindUniqueArgs>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findFirst<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageFindFirstArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageFindFirstArgs>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await prisma.filePage.findFirst(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageFindFirstArgs>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findUniqueOrThrow<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageFindUniqueOrThrowArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageFindUniqueOrThrowArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const model = await prisma.filePage.findUniqueOrThrow(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageFindUniqueOrThrowArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findFirstOrThrow<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageFindFirstOrThrowArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageFindFirstOrThrowArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const model = await prisma.filePage.findFirstOrThrow(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageFindFirstOrThrowArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  protected static beforeCreate<ENTITY extends FilePageEntityBase>(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    _context: Context
  ): Awaitable<void> {}

  protected static afterCreate<ENTITY extends FilePageEntityBase>(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    _one: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  public static async create<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageCreateArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageCreateArgs>,
    context: Context,
  ): Promise<ENTITY> {
    await (this as any).beforeCreate(context);
    const model = await prisma.filePage.create(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageCreateArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    await (this as any).afterCreate(one, context);
    return one;
  }

  protected static PRIMITIVE_FIELDS: FilePagePrimitiveField[] = [
    'id',
    'createdAt',
    'updatedAt',
    'fileId',
    'pageId',
    'lines',
  ];

  protected static beforeUpdate<ENTITY extends FilePageEntityBase>(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  protected static afterUpdate<ENTITY extends FilePageEntityBase>(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _oneAfter: ENTITY,
    _updatedFields: FilePagePrimitiveField[],
    _context: Context
  ): Awaitable<void> {}

  public static async update<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageUpdateArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageUpdateArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUniqueOrThrow(
      { where: args.where },
      context
    ) as ENTITY;
    await (this as any).beforeUpdate(oneBefore, context);
    const model = await prisma.filePage.update(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageUpdateArgs>
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

  protected static beforeDelete<ENTITY extends FilePageEntityBase>(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  protected static afterDelete<ENTITY extends FilePageEntityBase>(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  public static async delete<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageDeleteArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageDeleteArgs>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUniqueOrThrow(
      { where: args.where },
      context
    ) as ENTITY;
    await (this as any).beforeDelete(oneBefore, context);
    const model = await prisma.filePage.delete(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageDeleteArgs>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    await (this as any).afterDelete(oneBefore, context);
    return one;
  }

  public static async upsert<
    ENTITY extends FilePageEntityBase,
    T extends Prisma.FilePageUpsertArgs,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidatePrismaArgs<T, Prisma.FilePageUpsertArgs>,
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
    const model = await prisma.filePage.upsert(
      args as unknown as Prisma.SelectSubset<T, Prisma.FilePageUpsertArgs>
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
