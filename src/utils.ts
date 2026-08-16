import { DEFAULT_BATCH_SIZE } from "./consts";
import { LoadKey } from "./types";

type BatchLoadQuery = {
  where: LoadKey;
  skip: number;
  take: number;
};

async function batchLoad<ENTITY>(
  loader: (query: BatchLoadQuery) => Promise<ENTITY[]>,
  keys: LoadKey[],
  batchSize: number = DEFAULT_BATCH_SIZE,
  topSize?: number
): Promise<ENTITY[]> {
  if (keys.length === 0) {
    return [];
  }
  const result: ENTITY[] = [];
  const where = buildWhere(keys);
  let offset = 0;
  let batch: ENTITY[] = [];
  const take = topSize === undefined ? batchSize : Math.min(batchSize, topSize);
  do {
    const query = { where, skip: offset, take };
    batch = await loader(query);
    if (topSize === undefined || result.length + batch.length <= topSize) {
      result.push(...batch);
    } else {
      if (result.length < topSize) {
        result.push(...batch.slice(0, topSize - result.length));
      }
      break;
    }
    offset += batch.length;
  } while (batch.length === batchSize);
  return result;
}

async function batchLoadTopMany<ENTITY>(
  loader: (query: BatchLoadQuery) => Promise<ENTITY[]>,
  matcher: (key: LoadKey, entity: ENTITY) => boolean,
  keys: LoadKey[],
  topSize: number,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<ENTITY[]> {
  const result: ENTITY[] = [];
  if (keys.length === 0 || topSize <= 0) {
    return result;
  }
  const where = buildWhere(keys, false);
  const counts = keys.map(() => 0);
  let offset = 0;
  let batch: ENTITY[] = [];
  do {
    batch = await loader({
      where,
      skip: offset,
      take: batchSize,
    });
    for (const entity of batch) {
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        if (counts[index] >= topSize) {
          continue;
        }
        if (matcher(key, entity)) {
          result.push(entity);
          counts[index] += 1;
          break;
        }
      }
    }
    offset += batch.length;
  } while (batch.length === batchSize && counts.some((count) => count < topSize));
  return result;
}

function compareObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && compare(a[key], b[key])
  );
}

function buildWhere(loadKeys: LoadKey[], allowIn: boolean = true): LoadKey {
  if (loadKeys.length === 0) {
    return {};
  }
  const map = loadKeys.reduce((acc, loadKey) => {
    Object.entries(loadKey).forEach((entry) => {
      const array = (acc[entry[0]] ?? []) as unknown[];
      if (!array.some((value) => compare(value, entry[1]))) {
        array.push(entry[1]);
      }
      acc[entry[0]] = array;
    });
    return acc;
  }, {} as Record<string, unknown[]>);
  const allKeys = Object.keys(map);
  const entries = Object.entries(map) as [string, unknown[]][];
  const singleKeys = entries
    .filter((entry) => entry[1].length === 1)
    .map((entry) => entry[0]);
  const singleKeySet = new Set(singleKeys);
  const multiKeys = allKeys.filter((key) => !singleKeySet.has(key));
  const where = Object.entries(loadKeys[0])
    .filter((entry) => singleKeySet.has(entry[0]))
    .reduce((acc, entry) => {
      acc[entry[0]] = entry[1];
      return acc;
    }, {} as LoadKey);
  if (multiKeys.length === 0) {
    return where;
  }
  if (allowIn && multiKeys.length === 1) {
    const onlyMultiKey = multiKeys[0];
    const values = map[onlyMultiKey] as unknown[];
    if (!["function", "object"].includes(typeof values[0])) {
      where[onlyMultiKey] = { in: values };
      return where;
    }
  }
  where["OR"] = loadKeys.map((loadKey) => omit(loadKey, singleKeys));
  return where;
}

function entityCompare<ENTITY>(
  original: ENTITY,
  updated: ENTITY,
  fields: readonly string[]
): string[] {
  return fields.filter((field) => {
    const value1 = (original as Record<string, unknown>)[field];
    const value2 = (updated as Record<string, unknown>)[field];
    return !compare(value1, value2);
  });
}

function compare<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) {
    return false;
  }
  if (a === null || b === null) {
    return false;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => compare(value, b[index]));
  }
  if (typeA !== "object") {
    return false;
  }
  return compareObjects(
    a as Record<string, unknown>,
    b as Record<string, unknown>
  );
}

function omit<T extends Record<string, unknown>, K extends Extract<keyof T, string>>(
  object: T,
  keys: K | readonly K[]
): Omit<T, K> {
  const keyList = (typeof keys === "string" ? [keys] : [...keys]) as K[];
  const result = {} as Omit<T, K>;
  for (const key of Object.keys(object) as K[]) {
    if (!keyList.includes(key)) {
      (result as Record<string, unknown>)[key as string] = object[key];
    }
  }
  return result;
}

export {
  batchLoad,
  batchLoadTopMany,
  buildWhere,
  compare,
  entityCompare,
  omit,
};
