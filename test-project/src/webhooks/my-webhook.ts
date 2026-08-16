import { CommonResponse } from "@airent/api";
import * as z from "zod";
import { Context } from "../context";

export const Params = z.object({});
export type Params = z.infer<typeof Params>;

export const parser = (request: Request) =>
  request.json().then(Params.parseAsync);

export const authorizer = (_context: Context, _options?: {}) => {
  return;
};

export function executor(body: Params, context: Context): CommonResponse {
  return { code: 200, result: { body, rc: context } };
}
