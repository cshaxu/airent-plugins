// airent imports
import { ValidatePrismaArgs, batchLoad, batchLoadTopMany, entityCompare } from '../../../../src/index';
// config imports
import prisma from '../../prisma';
// entity imports
import { ComputedFilePagePrimitiveField } from '../types/computed-file-page';
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
import {
  ComputedFilePageFieldRequest,
  ComputedFilePageResponse,
  SelectedComputedFilePageResponse,
  ComputedFilePage,
  ComputedFilePageModel,
} from '../types/computed-file-page';

export class ComputedFilePageEntityBase extends BaseEntity<
  ComputedFilePageModel, Context, ComputedFilePageFieldRequest, ComputedFilePageResponse
> {
  public fileId!: string;
  public pageId!: number;

  protected filePage?: FilePageEntity;

  public constructor(
    model: ComputedFilePageModel,
    context: Context,
    group: ComputedFilePageEntityBase[],
    lock: AsyncLock,
  ) {
    super(context, group, lock);
    this._aliasMapFromModel['fileId'] = 'fileId';
    this._aliasMapToModel['fileId'] = 'fileId';
    this._aliasMapFromModel['pageId'] = 'pageId';
    this._aliasMapToModel['pageId'] = 'pageId';
    this.fromModelInner(model, true);
    this.initialize(model, context);
  }

  public async present<S extends ComputedFilePageFieldRequest>(fieldRequest: S): Promise<SelectedComputedFilePageResponse<S>> {
    await this.beforePresent(fieldRequest);
    const response = {
      ...(fieldRequest.fileId !== undefined && { fileId: this.fileId }),
      ...(fieldRequest.pageId !== undefined && { pageId: this.pageId }),
      ...(fieldRequest.filePage !== undefined && { filePage: await this.getFilePage().then((one) => one.present(fieldRequest.filePage!)) }),
    };
    await this.afterPresent(fieldRequest, response as Select<ComputedFilePageResponse, S>);
    return response as SelectedComputedFilePageResponse<S>;
  }

  public static async presentMany<
    ENTITY extends ComputedFilePageEntityBase,
    S extends ComputedFilePageFieldRequest
  >(entities: ENTITY[], fieldRequest: S): Promise<SelectedComputedFilePageResponse<S>[]> {
    return await sequential(entities.map((one) => () => one.present(fieldRequest)));
  }

  /** associations */

  protected filePageLoadConfig: LoadConfig<ComputedFilePageEntityBase, FilePageEntity> = {
    name: 'ComputedFilePageEntity.filePage',
    filter: (one: ComputedFilePageEntityBase) => one.filePage === undefined,
    getter: (sources: ComputedFilePageEntityBase[]) => {
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
    setter: (sources: ComputedFilePageEntityBase[], targets: FilePageEntity[]) => {
      const map = toObjectMap(targets, (one) => JSON.stringify({ fileId: one.fileId, pageId: one.pageId }));
      sources.forEach((one) => (one.filePage = map.get(JSON.stringify({ fileId: one.fileId, pageId: one.pageId }))!));
    },
  };

  public async getFilePage(): Promise<FilePageEntity> {
    if (this.filePage !== undefined) {
      return this.filePage;
    }
    await this.load(this.filePageLoadConfig);
    return this.filePage!;
  }

  public setFilePage(filePage?: FilePageEntity): void {
    this.filePage = filePage;
  }
}
