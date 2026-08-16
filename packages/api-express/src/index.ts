import {
  CommonResponse,
  Dispatcher,
  DispatcherContext,
  ErrorHandler,
  isNil,
} from "@airent/api";
import { Awaitable } from "airent";
import {
  NextFunction as ExpressNextFunction,
  Request as ExpressRequest,
  RequestHandler as ExpressRequestHandler,
  Response as ExpressResponse,
} from "express";

type Authenticator<CONTEXT> = (request: ExpressRequest) => Awaitable<CONTEXT>;

type RequestParser<DATA> = (request: ExpressRequest) => Awaitable<DATA>;

type HandlerConfig<CONTEXT, DATA, PARSED, RESULT, ERROR> = {
  authenticator: Authenticator<CONTEXT>;
  requestParser: RequestParser<DATA>;
  errorHandler?: ErrorHandler<CONTEXT, DATA, PARSED, RESULT, ERROR>;
};

const bodyRequestParser = <DATA extends object>(request: ExpressRequest) =>
  request.body as DATA;

function handleWith<CONTEXT, DATA, PARSED, RESULT, ERROR>(
  dispatcher: Dispatcher<CONTEXT, DATA, RESULT, ERROR>,
  config: HandlerConfig<CONTEXT, DATA, PARSED, RESULT, ERROR>
): ExpressRequestHandler {
  const { authenticator, requestParser } = config;
  const errorHandler =
    config.errorHandler ??
    ((error) => {
      throw error;
    });

  return async (
    req: ExpressRequest,
    res: ExpressResponse,
    _next: ExpressNextFunction
  ) => {
    const dispatcherContext: DispatcherContext<CONTEXT, DATA, PARSED, RESULT> =
      {};
    try {
      dispatcherContext.context = await authenticator(req);
      dispatcherContext.data = await requestParser(req);
      const commonResponse = await dispatcher(
        dispatcherContext.data,
        dispatcherContext.context
      );
      respond(res, commonResponse);
      res.status(commonResponse.code).json(commonResponse.result).end();
    } catch (error) {
      const commonResponse = await errorHandler(error, dispatcherContext);
      res.status(commonResponse.code).json(commonResponse.result).end();
    }
  };
}

function respond<RESULT, ERROR>(
  res: ExpressResponse,
  commonResponse: CommonResponse<RESULT, ERROR>
): void {
  const { code, result, error } = commonResponse;
  const json = isNil(error) ? result ?? null : { error };
  res.status(code).json(json).end();
}

export {
  Authenticator,
  bodyRequestParser,
  HandlerConfig,
  handleWith,
  RequestParser,
};
