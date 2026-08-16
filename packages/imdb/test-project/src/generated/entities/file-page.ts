// airent-imdb imports
import { CreateArgs, DeleteArgs, FindFirstArgs, FindManyArgs, FindOneArgs, FindUniqueArgs, UpdateArgs, ValidateImdbArgs, entityCompare, batchLoad } from '../../../../src/index';
// config imports
import imdb from '../../imdb';
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
import { AliasedFileEntity } from '../../entities/aliased-file';
import { FilePageChunkEntity } from '../../entities/file-page-chunk';
import {
  FilePageFieldRequest,
  FilePageResponse,
  SelectedFilePageResponse,
  JsonValue,
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
  public lines!: JsonValue;

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
    const one = await FilePageEntityBase.findUnique({
      where: {
        id: this.id,
      },
    }, this.context);
    if (one === null) {
      throw new Error('FilePage not found.');
    }
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
      data: dirtyModel,
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
      data: model,
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
      const models = await batchLoad(imdb.aliasedFile.findMany, keys, 1234);
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
      const models = await batchLoad(imdb.filePageChunk.findMany, keys, 1234);
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

  /** imdb wrappers */

  public static async findMany<
    ENTITY extends FilePageEntityBase,
    T extends FindManyArgs<FilePageModel>,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindManyArgs<FilePageModel>>,
    context: Context,
  ): Promise<ENTITY[]> {
    const models = await imdb.filePage.findMany(
      args as FindManyArgs<FilePageModel>
    );
    const many = (this as any).fromArray(models, context);
    return many;
  }

  public static async findOne<
    ENTITY extends FilePageEntityBase,
    T extends FindOneArgs<FilePageModel>,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindOneArgs<FilePageModel>>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await imdb.filePage.findOne(
      args as FindOneArgs<FilePageModel>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findFirst<
    ENTITY extends FilePageEntityBase,
    T extends FindFirstArgs<FilePageModel>,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindFirstArgs<FilePageModel>>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await imdb.filePage.findFirst(
      args as FindFirstArgs<FilePageModel>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findUnique<
    ENTITY extends FilePageEntityBase,
    T extends FindUniqueArgs<FilePageModel>,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindUniqueArgs<FilePageModel>>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await imdb.filePage.findUnique(
      args as FindUniqueArgs<FilePageModel>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
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
    T extends CreateArgs<FilePageModel>,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, CreateArgs<FilePageModel>>,
    context: Context,
  ): Promise<ENTITY> {
    await (this as any).beforeCreate(context);
    const model = await imdb.filePage.create(
      args as CreateArgs<FilePageModel>
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
    T extends UpdateArgs<FilePageModel>,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, UpdateArgs<FilePageModel>>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUnique(
      { where: args.where },
      context
    ) as ENTITY | null;
    if (oneBefore === null) {
      throw new Error('FilePage not found.');
    }
    await (this as any).beforeUpdate(oneBefore, context);
    const model = await imdb.filePage.update(
      args as UpdateArgs<FilePageModel>
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
    T extends DeleteArgs<FilePageModel>,
  >(
    this: EntityConstructor<FilePageModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, DeleteArgs<FilePageModel>>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUnique(
      { where: args.where },
      context
    ) as ENTITY | null;
    if (oneBefore === null) {
      throw new Error('FilePage not found.');
    }
    await (this as any).beforeDelete(oneBefore, context);
    const model = await imdb.filePage.delete(
      args as DeleteArgs<FilePageModel>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    await (this as any).afterDelete(oneBefore, context);
    return one;
  }
}
