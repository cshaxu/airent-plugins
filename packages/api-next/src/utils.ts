import { CommonResponse } from "@airent/api";
import createHttpError from "http-errors";

const toDecoded = <S extends Record<string, any>>(params: S) =>
  Object.entries(params).reduce((acc, [key, value]) => {
    if (typeof value === "string") {
      (acc as Record<string, any>)[key] = decodeURIComponent(value);
    } else {
      (acc as Record<string, any>)[key] = value;
    }
    return acc;
  }, {} as S);

function toResult<RESULT = unknown, ERROR = unknown>(
  executed: CommonResponse<RESULT, ERROR>
): RESULT {
  const { result, error } = executed;
  if (result === undefined) {
    throw error ?? createHttpError.InternalServerError();
  }
  return result;
}

export { toDecoded, toResult };
