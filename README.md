# Airent plugins for JavaScript

This repository is the source monorepo for the Airent plugins under the
`@airent` namespace. It is intentionally **not** an npm or GitHub Packages
registry project.

## Packages

| Directory | Package |
| --- | --- |
| `packages/api` | `@airent/api` |
| `packages/api-express` | `@airent/api-express` |
| `packages/api-next` | `@airent/api-next` |
| `packages/api-next-tanstack` | `@airent/api-next-tanstack` |
| `packages/imdb` | `@airent/imdb` |
| `packages/prisma` | `@airent/prisma` |

## Git distribution branches

The `main` branch is for shared development. GitHub Actions automatically
creates one root-package branch for every directory above:

```text
split/api
split/api-express
split/api-next
split/api-next-tanstack
split/imdb
split/prisma
```

Install a package from the commit SHA on its matching split branch. For
example, after replacing `SPLIT_COMMIT_SHA` with a commit from `split/api`:

```json
{
  "dependencies": {
    "@airent/api": "github:cshaxu/airent-plugins-js#SPLIT_COMMIT_SHA"
  }
}
```

The core `airent` package remains separately maintained and published to npm.
