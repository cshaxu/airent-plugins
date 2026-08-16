import {
  CommonResponse,
  DispatcherContext,
  NormalizedError,
} from "@airent/api";
import { Request } from "express";
import { Context } from "./context";

export const dispatcherConfig = { errorHandler };

export const handlerConfig = { authenticator, requestParser, errorHandler };

function authenticator(_request: Request): Context {
  return {};
}

function requestParser(request: Request): Request {
  return request;
}

function errorHandler<DATA, PARSED, RESULT>(
  error: any,
  _: DispatcherContext<Context, DATA, PARSED, RESULT>
): CommonResponse<RESULT, NormalizedError> {
  return error;
}
