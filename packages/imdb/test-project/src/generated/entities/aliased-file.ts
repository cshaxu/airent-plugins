// airent-imdb imports
import { CreateArgs, DeleteArgs, FindFirstArgs, FindManyArgs, FindOneArgs, FindUniqueArgs, UpdateArgs, ValidateImdbArgs, entityCompare, batchLoad, batchLoadTopMany } from '../../../../src/index';
// config imports
import imdb from '../../imdb';
// entity imports
import { AliasedFilePrimitiveField } from '../types/aliased-file';
import { FilePageModel } from '../types/file-page';
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
import { FilePageEntity } from '../../entities/file-page';
import { FilePageChunkEntity } from '../../entities/file-page-chunk';
import {
  AliasedFileFieldRequest,
  AliasedFileResponse,
  SelectedAliasedFileResponse,
  FileType,
  AliasedFileModel,
} from '../types/aliased-file';

export class AliasedFileEntityBase extends BaseEntity<
  AliasedFileModel, Context, AliasedFileFieldRequest, AliasedFileResponse
> {
  public size!: number;
  public tags!: string[];
  public type!: FileType;
  public id!: string;

  /** @deprecated */
  protected pages?: FilePageEntity[];

  protected chunks?: FilePageChunkEntity[];

  public constructor(
    model: AliasedFileModel,
    context: Context,
    group: AliasedFileEntityBase[],
    lock: AsyncLock,
  ) {
    super(context, group, lock);
    this._aliasMapFromModel['size'] = 'size';
    this._aliasMapToModel['size'] = 'size';
    this._aliasMapFromModel['tags'] = 'tags';
    this._aliasMapToModel['tags'] = 'tags';
    this._aliasMapFromModel['type'] = 'type';
    this._aliasMapToModel['type'] = 'type';
    this._aliasMapFromModel['id'] = 'id';
    this._aliasMapToModel['id'] = 'id';
    this.fromModelInner(model, true);
    this.initialize(model, context);
  }

  /** mutators */

  public async reload(): Promise<this> {
    const one = await AliasedFileEntityBase.findUnique({
      where: {
        id: this.id,
      },
    }, this.context);
    if (one === null) {
      throw new Error('AliasedFile not found.');
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
    const one = await AliasedFileEntityBase.update({
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
    const one = await AliasedFileEntityBase.delete({
      where: {
        id: this.id,
      },
    }, this.context);
    const model = one.toModel();
    this.fromModelInner(model, true);
    return this;
  }

  public async present<S extends AliasedFileFieldRequest>(fieldRequest: S): Promise<SelectedAliasedFileResponse<S>> {
    await this.beforePresent(fieldRequest);
    const response = {
      ...(fieldRequest.size !== undefined && { size: this.size }),
      ...(fieldRequest.tags !== undefined && { tags: this.tags }),
      ...(fieldRequest.type !== undefined && { type: this.type }),
      ...(fieldRequest.chunks !== undefined && { chunks: await this.getChunks().then((a) => Promise.all(a.map((one) => one.present(fieldRequest.chunks!)))) }),
    };
    await this.afterPresent(fieldRequest, response as Select<AliasedFileResponse, S>);
    return response as SelectedAliasedFileResponse<S>;
  }

  public static async presentMany<
    ENTITY extends AliasedFileEntityBase,
    S extends AliasedFileFieldRequest
  >(entities: ENTITY[], fieldRequest: S): Promise<SelectedAliasedFileResponse<S>[]> {
    return await sequential(entities.map((one) => () => one.present(fieldRequest)));
  }

  /** self creator */

  public static async createOne<ENTITY extends AliasedFileEntityBase>(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    model: Partial<AliasedFileModel>,
    context: Context
  ): Promise<ENTITY> {
    const one = await AliasedFileEntityBase.create({
      data: model,
    }, context);
    const createdModel = one.toModel();
    return (this as any).fromOne(createdModel, context);
  }

  /** associations */

  /** @deprecated */
  protected pagesLoadConfig: LoadConfig<AliasedFileEntityBase, FilePageEntity> = {
    name: 'AliasedFileEntity.pages',
    filter: (one: AliasedFileEntityBase) => one.pages === undefined,
    getter: (sources: AliasedFileEntityBase[]) => {
      return sources
        .map((one) => ({
          fileId: one.id,
        }));
    },
    loader: async (keys: LoadKey[]) => {
      const models = await batchLoad(imdb.filePage.findMany, keys, 1234);
      return FilePageEntity.fromArray(models, this.context);
    },
    setter: (sources: AliasedFileEntityBase[], targets: FilePageEntity[]) => {
      const map = toArrayMap(targets, (one) => JSON.stringify({ fileId: one.fileId }));
      sources.forEach((one) => (one.pages = map.get(JSON.stringify({ fileId: one.id })) ?? []));
    },
  };

  /** @deprecated */
  public async getPages(): Promise<FilePageEntity[]> {
    if (this.pages !== undefined) {
      return this.pages;
    }
    await this.load(this.pagesLoadConfig);
    return this.pages!;
  }

  /** @deprecated */
  public setPages(pages?: FilePageEntity[]): void {
    this.pages = pages;
  }

  protected chunksLoadConfig: LoadConfig<AliasedFileEntityBase, FilePageChunkEntity> = {
    name: 'AliasedFileEntity.chunks',
    filter: (one: AliasedFileEntityBase) => one.chunks === undefined,
    getter: (sources: AliasedFileEntityBase[]) => {
      return sources
        .map((one) => ({
          fileId: one.id,
        }));
    },
    loader: async (keys: LoadKey[]) => {
      const models = await batchLoadTopMany((query) => imdb.filePageChunk.findMany({ ...query, orderBy: { pageId: 'asc', chunkId: 'desc' } }), (key, entity) => key.fileId === entity.fileId, keys, 10, 1234);
      return FilePageChunkEntity.fromArray(models, this.context);
    },
    setter: (sources: AliasedFileEntityBase[], targets: FilePageChunkEntity[]) => {
      const map = toArrayMap(targets, (one) => JSON.stringify({ fileId: one.fileId }));
      sources.forEach((one) => (one.chunks = map.get(JSON.stringify({ fileId: one.id })) ?? []));
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

  protected initialize(model: AliasedFileModel, context: Context): void {
    if (model.pages !== undefined) {
      this.pages = FilePageEntity.fromArray(model.pages, context);
    }
    if (model.chunks !== undefined) {
      this.chunks = FilePageChunkEntity.fromArray(model.chunks, context);
    }
  }

  /** imdb wrappers */

  public static async findMany<
    ENTITY extends AliasedFileEntityBase,
    T extends FindManyArgs<AliasedFileModel>,
  >(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindManyArgs<AliasedFileModel>>,
    context: Context,
  ): Promise<ENTITY[]> {
    const models = await imdb.aliasedFile.findMany(
      args as FindManyArgs<AliasedFileModel>
    );
    const many = (this as any).fromArray(models, context);
    return many;
  }

  public static async findOne<
    ENTITY extends AliasedFileEntityBase,
    T extends FindOneArgs<AliasedFileModel>,
  >(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindOneArgs<AliasedFileModel>>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await imdb.aliasedFile.findOne(
      args as FindOneArgs<AliasedFileModel>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findFirst<
    ENTITY extends AliasedFileEntityBase,
    T extends FindFirstArgs<AliasedFileModel>,
  >(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindFirstArgs<AliasedFileModel>>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await imdb.aliasedFile.findFirst(
      args as FindFirstArgs<AliasedFileModel>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  public static async findUnique<
    ENTITY extends AliasedFileEntityBase,
    T extends FindUniqueArgs<AliasedFileModel>,
  >(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, FindUniqueArgs<AliasedFileModel>>,
    context: Context,
  ): Promise<ENTITY | null> {
    const model = await imdb.aliasedFile.findUnique(
      args as FindUniqueArgs<AliasedFileModel>
    );
    const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;
    return one;
  }

  protected static beforeCreate<ENTITY extends AliasedFileEntityBase>(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    _context: Context
  ): Awaitable<void> {}

  protected static afterCreate<ENTITY extends AliasedFileEntityBase>(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    _one: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  public static async create<
    ENTITY extends AliasedFileEntityBase,
    T extends CreateArgs<AliasedFileModel>,
  >(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, CreateArgs<AliasedFileModel>>,
    context: Context,
  ): Promise<ENTITY> {
    await (this as any).beforeCreate(context);
    const model = await imdb.aliasedFile.create(
      args as CreateArgs<AliasedFileModel>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    await (this as any).afterCreate(one, context);
    return one;
  }

  protected static PRIMITIVE_FIELDS: AliasedFilePrimitiveField[] = [
    'size',
    'tags',
    'type',
    'id',
  ];

  protected static beforeUpdate<ENTITY extends AliasedFileEntityBase>(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  protected static afterUpdate<ENTITY extends AliasedFileEntityBase>(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _oneAfter: ENTITY,
    _updatedFields: AliasedFilePrimitiveField[],
    _context: Context
  ): Awaitable<void> {}

  public static async update<
    ENTITY extends AliasedFileEntityBase,
    T extends UpdateArgs<AliasedFileModel>,
  >(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, UpdateArgs<AliasedFileModel>>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUnique(
      { where: args.where },
      context
    ) as ENTITY | null;
    if (oneBefore === null) {
      throw new Error('AliasedFile not found.');
    }
    await (this as any).beforeUpdate(oneBefore, context);
    const model = await imdb.aliasedFile.update(
      args as UpdateArgs<AliasedFileModel>
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

  protected static beforeDelete<ENTITY extends AliasedFileEntityBase>(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  protected static afterDelete<ENTITY extends AliasedFileEntityBase>(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    _oneBefore: ENTITY,
    _context: Context
  ): Awaitable<void> {}

  public static async delete<
    ENTITY extends AliasedFileEntityBase,
    T extends DeleteArgs<AliasedFileModel>,
  >(
    this: EntityConstructor<AliasedFileModel, Context, ENTITY>,
    args: ValidateImdbArgs<T, DeleteArgs<AliasedFileModel>>,
    context: Context,
  ): Promise<ENTITY> {
    const oneBefore = await (this as any).findUnique(
      { where: args.where },
      context
    ) as ENTITY | null;
    if (oneBefore === null) {
      throw new Error('AliasedFile not found.');
    }
    await (this as any).beforeDelete(oneBefore, context);
    const model = await imdb.aliasedFile.delete(
      args as DeleteArgs<AliasedFileModel>
    );
    const one = (this as any).fromOne(model, context) as ENTITY;
    await (this as any).afterDelete(oneBefore, context);
    return one;
  }
}
