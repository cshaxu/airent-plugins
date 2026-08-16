import { CommonResponse } from "@airent/api";
import { Context } from "../context";

export const maxDuration = 60;

export const schedule = "0 1 * * *";

export function executor(context: Context): CommonResponse<Context> {
  return { code: 200, result: context };
}
