type LoadKey = Record<string, unknown>;

type ModelRecord = Record<string, unknown>;
type ModelMap = Record<string, ModelRecord>;

type SortOrder = "asc" | "desc";

type StringMatchMode = "default" | "insensitive";

type InFilter<T> = {
  in: T[];
};

type EqualityFilter<T> = {
  equals: T;
};

type NotFilter<T> = {
  not: FieldFilter<T>;
};

type ComparableFilter<T> = {
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
};

type StringFilter = {
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  mode?: StringMatchMode;
};

type FieldOperatorFilter<T> =
  | InFilter<T>
  | EqualityFilter<T>
  | NotFilter<T>
  | ComparableFilter<T>
  | (T extends string ? StringFilter : never);

type FieldFilter<T> = T | FieldOperatorFilter<T>;

type Where<MODEL extends ModelRecord> = Partial<{
  [KEY in Extract<keyof MODEL, string>]: FieldFilter<MODEL[KEY]>;
}> & {
  AND?: Where<MODEL>[];
  NOT?: Where<MODEL> | Where<MODEL>[];
  OR?: Where<MODEL>[];
};

type OrderBy<MODEL extends ModelRecord> = Partial<
  Record<Extract<keyof MODEL, string>, SortOrder>
>;

type FindManyArgs<MODEL extends ModelRecord> = {
  where?: Where<MODEL>;
  orderBy?: OrderBy<MODEL> | OrderBy<MODEL>[];
  skip?: number;
  take?: number;
};

type FindOneArgs<MODEL extends ModelRecord> = FindManyArgs<MODEL>;

type FindUniqueArgs<MODEL extends ModelRecord> = {
  where: Where<MODEL>;
};

type FindFirstArgs<MODEL extends ModelRecord> = FindManyArgs<MODEL>;

type CreateArgs<MODEL extends ModelRecord> = {
  data: Partial<MODEL>;
};

type UpdateArgs<MODEL extends ModelRecord> = {
  where: Where<MODEL>;
  data: Partial<MODEL>;
};

type DeleteArgs<MODEL extends ModelRecord> = {
  where: Where<MODEL>;
};

type DatabaseSeed<SCHEMA extends ModelMap> = Partial<{
  [KEY in keyof SCHEMA]: Partial<SCHEMA[KEY]>[];
}>;

type ValidateImdbArgs<T, U> = {
  [KEY in keyof T]: KEY extends keyof U ? T[KEY] : never;
} & (T extends { select: unknown }
  ? "Property `select` not supported by @airent/imdb."
  : {}) &
  (T extends { include: unknown }
    ? "Property `include` not supported by @airent/imdb."
    : {});

export {
  ComparableFilter,
  CreateArgs,
  DatabaseSeed,
  DeleteArgs,
  EqualityFilter,
  FieldFilter,
  FieldOperatorFilter,
  FindFirstArgs,
  FindManyArgs,
  FindOneArgs,
  FindUniqueArgs,
  InFilter,
  LoadKey,
  ModelMap,
  ModelRecord,
  NotFilter,
  OrderBy,
  SortOrder,
  StringFilter,
  StringMatchMode,
  UpdateArgs,
  ValidateImdbArgs,
  Where,
};
