import { CommonResponse, parseBodyWith } from "@airent/api";
import * as z from "zod";
import { Context } from "../context";

export const Params = z.object({});
export type Params = z.infer<typeof Params>;

export const parser = parseBodyWith(Params);

export function executor(params: Params, context: Context): CommonResponse {
  return { code: 200, result: { params, context } };
}
