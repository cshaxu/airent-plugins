type LoadKey = Record<string, any>;

type ValidatePrismaArgs<T, U> = {
  [key in keyof T]: key extends keyof U ? T[key] : never;
} & (T extends { select: any }
  ? "Property `select` not supported by @airent/prisma."
  : {});

export { LoadKey, ValidatePrismaArgs };
