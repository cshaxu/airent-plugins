import { compare } from "./utils";
import {
  CreateArgs,
  ComparableFilter,
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
  ModelMap,
  ModelRecord,
  NotFilter,
  OrderBy,
  SortOrder,
  StringFilter,
  UpdateArgs,
  Where,
} from "./types";

class InMemoryDatabaseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InMemoryDatabaseError";
  }
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function typedEntries<T extends Record<string, unknown>>(
  record: T
): [Extract<keyof T, string>, T[Extract<keyof T, string>]][] {
  return Object.entries(record) as [
    Extract<keyof T, string>,
    T[Extract<keyof T, string>]
  ][];
}

function isInFilter<T>(value: unknown): value is InFilter<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "in" in value &&
    Array.isArray((value as InFilter<T>).in)
  );
}

function isEqualityFilter<T>(value: unknown): value is EqualityFilter<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "equals" in value
  );
}

function isNotFilter<T>(value: unknown): value is NotFilter<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "not" in value
  );
}

function isComparableFilter<T>(value: unknown): value is ComparableFilter<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    (("gt" in value && (value as ComparableFilter<T>).gt !== undefined) ||
      ("gte" in value && (value as ComparableFilter<T>).gte !== undefined) ||
      ("lt" in value && (value as ComparableFilter<T>).lt !== undefined) ||
      ("lte" in value && (value as ComparableFilter<T>).lte !== undefined))
  );
}

function isStringFilter(value: unknown): value is StringFilter {
  return (
    typeof value === "object" &&
    value !== null &&
    (("contains" in value &&
      typeof (value as StringFilter).contains === "string") ||
      ("startsWith" in value &&
        typeof (value as StringFilter).startsWith === "string") ||
      ("endsWith" in value &&
        typeof (value as StringFilter).endsWith === "string"))
  );
}

function isOperatorFilter<T>(value: unknown): value is FieldOperatorFilter<T> {
  return (
    isInFilter(value) ||
    isEqualityFilter(value) ||
    isNotFilter(value) ||
    isComparableFilter(value) ||
    isStringFilter(value)
  );
}

function normalizeString(value: string, mode?: StringFilter["mode"]): string {
  return mode === "insensitive" ? value.toLowerCase() : value;
}

function matchesStringFilter(actual: unknown, expected: StringFilter): boolean {
  if (typeof actual !== "string") {
    return false;
  }
  const current = normalizeString(actual, expected.mode);
  if (expected.contains !== undefined) {
    return current.includes(normalizeString(expected.contains, expected.mode));
  }
  if (expected.startsWith !== undefined) {
    return current.startsWith(
      normalizeString(expected.startsWith, expected.mode)
    );
  }
  if (expected.endsWith !== undefined) {
    return current.endsWith(normalizeString(expected.endsWith, expected.mode));
  }
  return true;
}

function matchesComparableFilter<T>(
  actual: T,
  expected: ComparableFilter<T>
): boolean {
  if (
    expected.gt !== undefined &&
    compareOrderValues(actual, expected.gt) <= 0
  ) {
    return false;
  }
  if (
    expected.gte !== undefined &&
    compareOrderValues(actual, expected.gte) < 0
  ) {
    return false;
  }
  if (
    expected.lt !== undefined &&
    compareOrderValues(actual, expected.lt) >= 0
  ) {
    return false;
  }
  if (
    expected.lte !== undefined &&
    compareOrderValues(actual, expected.lte) > 0
  ) {
    return false;
  }
  return true;
}

function matchesField<T>(actual: T, expected: FieldFilter<T>): boolean {
  if (isOperatorFilter(expected)) {
    if (isInFilter(expected)) {
      return expected.in.some((candidate) => compare(candidate, actual));
    }
    if (isEqualityFilter(expected)) {
      return compare(actual, expected.equals);
    }
    if (isNotFilter(expected)) {
      return !matchesField(actual, expected.not);
    }
    if (isComparableFilter(expected)) {
      return matchesComparableFilter(actual, expected);
    }
    if (isStringFilter(expected)) {
      return matchesStringFilter(actual, expected);
    }
  }
  return compare(actual, expected);
}

function matchesWhere<MODEL extends ModelRecord>(
  row: MODEL,
  where?: Where<MODEL>
): boolean {
  if (where === undefined) {
    return true;
  }
  const { AND, NOT, OR, ...conditions } = where;
  const isMatch = Object.entries(conditions).every(([field, expected]) =>
    matchesField(row[field], expected)
  );
  if (!isMatch) {
    return false;
  }
  if (
    AND !== undefined &&
    !AND.every((clause) => matchesWhere(row, clause))
  ) {
    return false;
  }
  if (NOT !== undefined) {
    const clauses = Array.isArray(NOT) ? NOT : [NOT];
    if (clauses.some((clause) => matchesWhere(row, clause))) {
      return false;
    }
  }
  if (OR === undefined || OR.length === 0) {
    return true;
  }
  return OR.some((clause) => matchesWhere(row, clause));
}

function normalizeOrderBy<MODEL extends ModelRecord>(
  orderBy?: OrderBy<MODEL> | OrderBy<MODEL>[]
): [string, SortOrder][] {
  if (orderBy === undefined) {
    return [];
  }
  const array = Array.isArray(orderBy) ? orderBy : [orderBy];
  return array.flatMap((item) =>
    Object.entries(item).filter((entry) => entry[1] !== undefined)
  ) as [string, SortOrder][];
}

function compareOrderValues(a: unknown, b: unknown): number {
  if (compare(a, b)) {
    return 0;
  }
  if (a === undefined || a === null) {
    return -1;
  }
  if (b === undefined || b === null) {
    return 1;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "bigint" && typeof b === "bigint") {
    return a > b ? 1 : -1;
  }
  const valueA = JSON.stringify(a);
  const valueB = JSON.stringify(b);
  return valueA < valueB ? -1 : 1;
}

function applyQuery<MODEL extends ModelRecord>(
  rows: MODEL[],
  args: FindManyArgs<MODEL> = {}
): MODEL[] {
  const filtered = rows.filter((row) => matchesWhere(row, args.where));
  const orderEntries = normalizeOrderBy(args.orderBy);
  if (orderEntries.length > 0) {
    filtered.sort((a, b) => {
      for (const [field, direction] of orderEntries) {
        const result = compareOrderValues(a[field], b[field]);
        if (result !== 0) {
          return direction === "desc" ? -result : result;
        }
      }
      return 0;
    });
  }
  const skip = Math.max(0, args.skip ?? 0);
  const take = args.take === undefined ? undefined : Math.max(0, args.take);
  return filtered.slice(skip, take === undefined ? undefined : skip + take);
}

function findMatchingIndexes<MODEL extends ModelRecord>(
  rows: MODEL[],
  where: Where<MODEL>
): number[] {
  return rows.reduce((acc, row, index) => {
    if (matchesWhere(row, where)) {
      acc.push(index);
    }
    return acc;
  }, [] as number[]);
}

function findUniqueIndex<MODEL extends ModelRecord>(
  rows: MODEL[],
  where: Where<MODEL>,
  methodName: string
): number | null {
  const indexes = findMatchingIndexes(rows, where);
  if (indexes.length === 0) {
    return null;
  }
  if (indexes.length > 1) {
    throw new InMemoryDatabaseError(
      `${methodName} failed: expected a unique match but found ${indexes.length}.`
    );
  }
  return indexes[0];
}

class InMemoryCollection<MODEL extends ModelRecord> {
  private rows: MODEL[];

  public constructor(seedRows: Partial<MODEL>[] = []) {
    this.rows = seedRows.map((row) => cloneValue(row as MODEL));
  }

  public readonly reset = (rows: Partial<MODEL>[] = []): void => {
    this.rows = rows.map((row) => cloneValue(row as MODEL));
  };

  public readonly exportRows = (): MODEL[] => {
    return this.rows.map((row) => cloneValue(row));
  };

  public readonly findMany = async (
    args: FindManyArgs<MODEL> = {}
  ): Promise<MODEL[]> => {
    return applyQuery(this.rows, args).map((row) => cloneValue(row));
  };

  public readonly findOne = async (
    args: FindOneArgs<MODEL> = {}
  ): Promise<MODEL | null> => {
    return await this.findFirst(args);
  };

  public readonly findUnique = async (
    args: FindUniqueArgs<MODEL>
  ): Promise<MODEL | null> => {
    const index = findUniqueIndex(this.rows, args.where, "findUnique");
    return index === null ? null : cloneValue(this.rows[index]);
  };

  public readonly findFirst = async (
    args: FindFirstArgs<MODEL> = {}
  ): Promise<MODEL | null> => {
    const row = applyQuery(this.rows, { ...args, take: 1 })[0];
    return row === undefined ? null : cloneValue(row);
  };

  public readonly create = async (
    args: CreateArgs<MODEL>
  ): Promise<MODEL> => {
    const row = cloneValue(args.data as MODEL);
    this.rows.push(row);
    return cloneValue(row);
  };

  public readonly update = async (
    args: UpdateArgs<MODEL>
  ): Promise<MODEL> => {
    const index = findUniqueIndex(this.rows, args.where, "update");
    if (index === null) {
      throw new InMemoryDatabaseError("update failed: record not found.");
    }
    const next = {
      ...this.rows[index],
      ...cloneValue(args.data),
    } as MODEL;
    this.rows[index] = next;
    return cloneValue(next);
  };

  public readonly delete = async (
    args: DeleteArgs<MODEL>
  ): Promise<MODEL> => {
    const index = findUniqueIndex(this.rows, args.where, "delete");
    if (index === null) {
      throw new InMemoryDatabaseError("delete failed: record not found.");
    }
    const [deleted] = this.rows.splice(index, 1);
    return cloneValue(deleted);
  };
}

class InMemoryDatabase<SCHEMA extends ModelMap> {
  private readonly collections = new Map<
    string,
    InMemoryCollection<ModelRecord>
  >();

  public constructor(seed: DatabaseSeed<SCHEMA> = {}) {
    this.seed(seed);
  }

  public table<KEY extends keyof SCHEMA & string>(
    name: KEY
  ): InMemoryCollection<SCHEMA[KEY]> {
    if (!this.collections.has(name)) {
      const collection = new InMemoryCollection<SCHEMA[KEY]>();
      this.collections.set(
        name,
        collection as unknown as InMemoryCollection<ModelRecord>
      );
    }
    return this.collections.get(name)! as unknown as InMemoryCollection<SCHEMA[KEY]>;
  }

  public seed(seed: DatabaseSeed<SCHEMA>): void {
    for (const [name, rows] of typedEntries(seed)) {
      if (rows !== undefined) {
        this.table(name).reset(rows);
      }
    }
  }

  public clear(): void {
    for (const collection of Array.from(this.collections.values())) {
      collection.reset();
    }
  }

  public exportData(): DatabaseSeed<SCHEMA> {
    return Array.from(this.collections.entries()).reduce((acc, [name, collection]) => {
      acc[name as keyof SCHEMA] = collection.exportRows() as DatabaseSeed<SCHEMA>[keyof SCHEMA];
      return acc;
    }, {} as DatabaseSeed<SCHEMA>);
  }
}

type InMemoryDatabaseClient<SCHEMA extends ModelMap> = InMemoryDatabase<SCHEMA> & {
  [KEY in keyof SCHEMA]: InMemoryCollection<SCHEMA[KEY]>;
};

function createInMemoryDatabase<SCHEMA extends ModelMap>(
  seed: DatabaseSeed<SCHEMA> = {}
): InMemoryDatabaseClient<SCHEMA> {
  const database = new InMemoryDatabase<SCHEMA>(seed);
  return new Proxy(database as InMemoryDatabaseClient<SCHEMA>, {
    get(target, property, receiver) {
      if (typeof property === "string" && !(property in target)) {
        return target.table(property as keyof SCHEMA & string);
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

export {
  createInMemoryDatabase,
  InMemoryCollection,
  InMemoryDatabase,
  InMemoryDatabaseClient,
  InMemoryDatabaseError,
};
