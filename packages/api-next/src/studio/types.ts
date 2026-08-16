import { z } from "zod";

export type AirentApiNextStudioGroupKey = "entities" | "debug" | "webhook" | "cron";

export type AirentApiNextStudioSectionKey = "query" | "params" | "body";

export type AirentApiNextStudioAuthKind = "none" | "internal" | "cron" | "headers";

export type AirentApiNextStudioSectionDescriptor = {
  key: AirentApiNextStudioSectionKey;
  label: string;
  defaultValue: string;
  summaryLines: string[];
};

export type AirentApiNextStudioFieldRequestDescriptor = {
  allFields: string[];
  defaultFields: string[];
};

export type AirentApiNextStudioEndpointDescriptor = {
  id: string;
  group: AirentApiNextStudioGroupKey;
  label: string;
  entityName?: string;
  operation?: string;
  path: string;
  method: "GET" | "POST";
  auth: AirentApiNextStudioAuthKind;
  payloadStyle: "data" | "body" | "none";
  notes: string[];
  sections: AirentApiNextStudioSectionDescriptor[];
  fieldRequest: AirentApiNextStudioFieldRequestDescriptor | null;
};

export type AirentApiNextStudioGroupDescriptor = {
  key: AirentApiNextStudioGroupKey;
  label: string;
  description: string;
  endpoints: AirentApiNextStudioEndpointDescriptor[];
};

export type AirentApiNextStudioEntityEndpointSource = {
  id: string;
  label: string;
  entityName: string;
  operation: string;
  path: string;
  method: "POST";
  fieldRequestFields: readonly string[];
  primitiveFieldRequestFields: readonly string[];
  querySchema?: z.ZodTypeAny | null;
  paramsSchema?: z.ZodTypeAny | null;
  bodySchema?: z.ZodTypeAny | null;
};

export type AirentApiNextStudioDebugEndpointSource = {
  id: string;
  label: string;
  path: string;
  method: "POST";
  auth: "internal";
  bodySchema?: z.ZodTypeAny | null;
};

export type AirentApiNextStudioWebhookEndpointSource = {
  id: string;
  label: string;
  path: string;
  method: "POST";
  auth: "headers";
  bodySchema?: z.ZodTypeAny | null;
  hasCustomAuthorizer?: boolean;
};

export type AirentApiNextStudioCronEndpointSource = {
  id: string;
  label: string;
  path: string;
  method: "GET";
  auth: "cron";
  schedule?: string | null;
  maxDuration?: number | null;
};

export type BuildAirentApiNextStudioCatalogArgs = {
  entities?: readonly AirentApiNextStudioEntityEndpointSource[];
  debug?: readonly AirentApiNextStudioDebugEndpointSource[];
  webhook?: readonly AirentApiNextStudioWebhookEndpointSource[];
  cron?: readonly AirentApiNextStudioCronEndpointSource[];
};