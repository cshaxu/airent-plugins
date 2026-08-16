import {
  CommonResponse,
  Dispatcher,
  DispatcherContext,
  ErrorHandler,
  isNil,
} from "@airent/api";
import { Awaitable } from "airent";
import createHttpError from "http-errors";

type Authenticator<CONTEXT> = (request: Request) => Awaitable<CONTEXT>;

type RequestParser<DATA> = (request: Request) => Awaitable<DATA>;

type HandlerConfig<CONTEXT, DATA, PARSED, RESULT, ERROR> = {
  isCustomResponse?: boolean;
  authenticator: Authenticator<CONTEXT>;
  requestParser: RequestParser<DATA>;
  errorHandler?: ErrorHandler<CONTEXT, DATA, PARSED, RESULT, ERROR>;
};

type Handler = (request: Request) => Promise<Response>;

async function jsonRequestParser<DATA extends object>(
  request: Request
): Promise<DATA> {
  try {
    return await request.json();
  } catch (error: any) {
    throw createHttpError.BadRequest(error.message);
  }
}

function handleWith<CONTEXT, DATA, PARSED, RESULT, ERROR>(
  dispatcher: Dispatcher<CONTEXT, DATA, RESULT, ERROR>,
  config: HandlerConfig<CONTEXT, DATA, PARSED, RESULT, ERROR>
): Handler {
  const { isCustomResponse, authenticator, requestParser } = config;
  const errorHandler =
    config.errorHandler ??
    ((error) => {
      throw error;
    });

  return async (request: Request) => {
    const dispatcherContext: DispatcherContext<CONTEXT, DATA, PARSED, RESULT> =
      {};
    try {
      dispatcherContext.context = await authenticator(request);
      dispatcherContext.data = await requestParser(request);
      const commonResponse = await dispatcher(
        dispatcherContext.data,
        dispatcherContext.context
      );
      if (isCustomResponse && "result" in commonResponse) {
        return commonResponse.result as Response;
      }
      return buildJsonResponse(commonResponse);
    } catch (error) {
      const commonResponse = await errorHandler(error, dispatcherContext);
      return buildJsonResponse(commonResponse);
    }
  };
}

function buildJsonResponse<RESULT, ERROR>(
  commonResponse: CommonResponse<RESULT, ERROR>
): Response {
  const { code, result, error } = commonResponse;
  const json = isNil(error) ? result ?? null : { error };
  return Response.json(json, { status: code });
}

export {
  Authenticator,
  Handler,
  HandlerConfig,
  handleWith,
  jsonRequestParser,
  RequestParser,
};
