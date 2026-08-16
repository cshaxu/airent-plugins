# @airent/imdb

Airent IMDB Plugin - generate Airent entity wrappers backed by an in-memory database.

## What it does

- Adds Airent entity methods that read and write through an `imdb` client.
- Keeps the IMDB contract intentionally small for test environments: `findMany`, `findOne`, `findFirst`, `findUnique`, `create`, `update`, `delete`, and association loaders.
- Exposes a small in-memory database runtime so tests, prototypes, and local workflows can run without an external database.

## Installation

```bash
npm install @airent/imdb
```

This package expects a modern Node runtime. The current runtime uses `Proxy` and `structuredClone`, so treat Node 18+ as the supported baseline.

Then configure Airent:

```bash
npx airent-imdb
```

This adds the IMDB augmentor and asks how generated entities should import your database instance.

## Runtime setup

Create an `imdb` instance somewhere in your project:

```ts
import { createInMemoryDatabase } from "@airent/imdb";
import { UserModel } from "./generated/types/user";

export default createInMemoryDatabase<{
  user: UserModel;
}>();
```

The generic schema is the source of truth for valid collection names. The runtime lazily creates collections on first access, so keeping that schema aligned with your generated model types matters.

Point `airent.config.json` at that import:

```json
{
  "imdb": {
    "imdbImport": "import imdb from '@/lib/imdb';",
    "imdbBatchSize": 1000
  }
}
```

## Schema notes

- Your user-written `imdb` module should import generated model/types from `src/generated/types/*` rather than redefining record shapes by hand.
- Set `isImdb: false` on an entity to opt it out of IMDB wrapper generation.
- Set `isImdb: true` on association fields that should be initialized from nested model data.
- Set `imdbLoader: false` on an association field if you want to supply your own loader implementation.
- Use `imdb.collectionName` on an entity when the in-memory collection name should differ from the default camel-cased entity name.

## Query support

The IMDB runtime keeps a small CRUD surface, but supports common filter shapes used by test apps:

- logical filters: `OR`, `AND`, `NOT`
- equality filters: direct equality, `equals`, `in`, `not`
- comparison filters: `gt`, `gte`, `lt`, `lte`
- string filters: `contains`, `startsWith`, `endsWith`, optional `mode: 'insensitive'`
- list controls: `orderBy`, `skip`, `take`

Behavior notes:

- `findUnique`, `update`, and `delete` expect the `where` clause to resolve to at most one record.
- `update` performs a shallow merge on `data`.
- Returned records are cloned on read and write so test code does not mutate stored state by reference.

There is no separate DBML or Prisma generation step. Update your Airent schemas, then run `npx airent`.
