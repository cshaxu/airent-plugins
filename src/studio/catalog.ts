import { z } from "zod";

import {
  AirentApiNextStudioCronEndpointSource,
  AirentApiNextStudioEntityEndpointSource,
  AirentApiNextStudioDebugEndpointSource,
  AirentApiNextStudioEndpointDescriptor,
  AirentApiNextStudioGroupDescriptor,
  AirentApiNextStudioSectionDescriptor,
  AirentApiNextStudioWebhookEndpointSource,
  BuildAirentApiNextStudioCatalogArgs,
} from "./types";

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (
    schema.type === "optional" ||
    schema.type === "nullable" ||
    schema.type === "default"
  ) {
    return unwrapSchema(
      (schema as z.ZodTypeAny & { unwrap(): z.ZodTypeAny }).unwrap()
    );
  }
  if (schema.type === "pipe") {
    return unwrapSchema((schema as z.ZodTypeAny & { in: z.ZodTypeAny }).in);
  }
  return schema;
}

function buildSchemaExample(schema: z.ZodTypeAny): unknown {
  const unwrapped = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodObject) {
    return Object.entries(unwrapped.shape).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        acc[key] = buildSchemaExample(value as z.ZodTypeAny);
        return acc;
      },
      {}
    );
  }
  if (unwrapped instanceof z.ZodString) return "";
  if (unwrapped instanceof z.ZodNumber) return 0;
  if (unwrapped instanceof z.ZodBoolean) return false;
  if (unwrapped instanceof z.ZodArray) return [];
  if (unwrapped instanceof z.ZodEnum) return unwrapped.options[0] ?? "";
  if (unwrapped instanceof z.ZodUnion) {
    const firstOption = unwrapped.options[0];
    return firstOption ? buildSchemaExample(firstOption as z.ZodTypeAny) : {};
  }
  if (unwrapped instanceof z.ZodLiteral) return unwrapped.value;
  if (unwrapped instanceof z.ZodAny || unwrapped instanceof z.ZodUnknown) {
    return {};
  }
  return {};
}

function describeSchema(
  prefix: string,
  schema: z.ZodTypeAny,
  lines: string[] = []
): string[] {
  const unwrapped = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodObject) {
    Object.entries(unwrapped.shape).forEach(([key, value]) => {
      describeSchema(prefix ? `${prefix}.${key}` : key, value as z.ZodTypeAny, lines);
    });
    return lines;
  }
  if (unwrapped instanceof z.ZodArray) {
    lines.push(`${prefix}: array`);
    return lines;
  }
  if (unwrapped instanceof z.ZodString) {
    lines.push(`${prefix}: string`);
    return lines;
  }
  if (unwrapped instanceof z.ZodNumber) {
    lines.push(`${prefix}: number`);
    return lines;
  }
  if (unwrapped instanceof z.ZodBoolean) {
    lines.push(`${prefix}: boolean`);
    return lines;
  }
  if (unwrapped instanceof z.ZodEnum) {
    lines.push(`${prefix}: enum(${unwrapped.options.join(", ")})`);
    return lines;
  }
  if (unwrapped instanceof z.ZodLiteral) {
    lines.push(`${prefix}: literal(${String(unwrapped.value)})`);
    return lines;
  }
  lines.push(`${prefix}: value`);
  return lines;
}

function buildSection(
  key: "query" | "params" | "body",
  schema: z.ZodTypeAny
): AirentApiNextStudioSectionDescriptor {
  const labelMap = { query: "Query", params: "Params", body: "Body" } as const;
  return {
    key,
    label: labelMap[key],
    defaultValue: JSON.stringify(buildSchemaExample(schema), null, 2),
    summaryLines: describeSchema("", schema),
  };
}

function buildEntityEndpoints(
  endpoints: readonly AirentApiNextStudioEntityEndpointSource[]
): AirentApiNextStudioEndpointDescriptor[] {
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    group: "entities",
    label: endpoint.label,
    entityName: endpoint.entityName,
    operation: endpoint.operation,
    path: endpoint.path,
    method: endpoint.method,
    auth: "none",
    payloadStyle: "data",
    notes: [
      `Entity: ${endpoint.entityName}`,
      `Operation: ${endpoint.operation}`,
      "Requests use current browser session credentials.",
    ],
    sections: [
      ...(endpoint.querySchema ? [buildSection("query", endpoint.querySchema)] : []),
      ...(endpoint.paramsSchema ? [buildSection("params", endpoint.paramsSchema)] : []),
      ...(endpoint.bodySchema ? [buildSection("body", endpoint.bodySchema)] : []),
    ],
    fieldRequest: {
      allFields: [...endpoint.fieldRequestFields],
      defaultFields: [...endpoint.primitiveFieldRequestFields],
    },
  }));
}

function buildDebugEndpoints(
  endpoints: readonly AirentApiNextStudioDebugEndpointSource[]
): AirentApiNextStudioEndpointDescriptor[] {
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    group: "debug",
    label: endpoint.label,
    path: endpoint.path,
    method: endpoint.method,
    auth: endpoint.auth,
    payloadStyle: "body",
    notes: ["Requires X-INTERNAL-SECRET header.", "Requests use POST JSON bodies."],
    sections: endpoint.bodySchema ? [buildSection("body", endpoint.bodySchema)] : [],
    fieldRequest: null,
  }));
}

function buildWebhookEndpoints(
  endpoints: readonly AirentApiNextStudioWebhookEndpointSource[]
): AirentApiNextStudioEndpointDescriptor[] {
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    group: "webhook",
    label: endpoint.label,
    path: endpoint.path,
    method: endpoint.method,
    auth: endpoint.auth,
    payloadStyle: "body",
    notes: [
      endpoint.hasCustomAuthorizer
        ? "Custom headers may be required by the webhook authorizer."
        : "No custom webhook authorizer detected.",
      "Requests use POST JSON bodies.",
    ],
    sections: endpoint.bodySchema ? [buildSection("body", endpoint.bodySchema)] : [],
    fieldRequest: null,
  }));
}

function buildCronEndpoints(
  endpoints: readonly AirentApiNextStudioCronEndpointSource[]
): AirentApiNextStudioEndpointDescriptor[] {
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    group: "cron",
    label: endpoint.label,
    path: endpoint.path,
    method: endpoint.method,
    auth: endpoint.auth,
    payloadStyle: "none",
    notes: [
      "Requires Authorization: Bearer <cron secret>.",
      ...(endpoint.schedule ? [`Schedule: ${endpoint.schedule}`] : []),
      ...(endpoint.maxDuration ? [`Max duration: ${String(endpoint.maxDuration)}s`] : []),
    ],
    sections: [],
    fieldRequest: null,
  }));
}

export function buildAirentApiNextStudioCatalog({
  entities = [],
  debug = [],
  webhook = [],
  cron = [],
}: BuildAirentApiNextStudioCatalogArgs = {}): AirentApiNextStudioGroupDescriptor[] {
  const groups: AirentApiNextStudioGroupDescriptor[] = [
    {
      key: "entities",
      label: "Entities",
      description: "Auto-generated Airent entity endpoints.",
      endpoints: buildEntityEndpoints(entities),
    },
    {
      key: "debug",
      label: "Debug",
      description: "Internal debug endpoints that require the internal secret.",
      endpoints: buildDebugEndpoints(debug),
    },
    {
      key: "webhook",
      label: "Webhook",
      description: "Webhook endpoints callable with custom headers and JSON bodies.",
      endpoints: buildWebhookEndpoints(webhook),
    },
    {
      key: "cron",
      label: "Cron",
      description: "Manual execution entry points for cron jobs.",
      endpoints: buildCronEndpoints(cron),
    },
  ];

  return groups.filter((group) => group.endpoints.length > 0);
}