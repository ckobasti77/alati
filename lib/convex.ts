"use client";

import { useMemo } from "react";
import {
  type RequestForQueries,
  useMutation as convexUseMutation,
  useQueries as convexUseQueries,
  useQuery as convexUseQuery,
} from "convex/react";
import { makeFunctionReference } from "convex/server";
import { convexToJson, type Value } from "convex/values";

type AnyRecord = Record<string, unknown>;

type ConvexQueryReference = Parameters<typeof convexUseQuery>[0];
type ConvexQueryArgs = Parameters<typeof convexUseQuery>[1];
type ConvexMutationReference = Parameters<typeof convexUseMutation>[0];

/** `"skip"` preskače query (npr. dok paleta nije otvorena ili nema sesije). */
export function useConvexQuery<T = unknown>(name: string, args: AnyRecord | "skip" = {}) {
  return convexUseQuery(
    name as unknown as ConvexQueryReference,
    args as ConvexQueryArgs,
  ) as T | undefined;
}

export type ConvexQueryState<T> = { data: T | undefined; error: Error | null };

/**
 * Kao `useConvexQuery`, ali greška se VRAĆA umesto da se baci u renderu (Convex `useQuery` baca, pa bi
 * greška jednog query-ja oborila celu stranicu). `data` je undefined dok se učitava ili kad je greška.
 */
export function useConvexQueryState<T = unknown>(name: string, args: AnyRecord | "skip" = {}): ConvexQueryState<T> {
  const skip = args === "skip";
  // Isti ključ kao Convex `useQuery`: semantički isti argumenti ne prave novu pretplatu.
  const argsKey = skip ? "skip" : JSON.stringify(convexToJson(args as Value));
  const queries = useMemo(() => {
    const request: RequestForQueries = {};
    if (!skip) request.query = { query: makeFunctionReference<"query">(name), args: args as Record<string, Value> };
    return request;
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [argsKey, name, skip],
  );
  const result = (convexUseQueries(queries) as Record<string, unknown>).query;
  if (result instanceof Error) return { data: undefined, error: result };
  return { data: result as T | undefined, error: null };
}

export function useConvexMutation<TArgs extends AnyRecord = AnyRecord, TResult = unknown>(
  name: string,
) {
  const mutation = convexUseMutation(name as unknown as ConvexMutationReference);
  return mutation as unknown as (args: TArgs) => Promise<TResult>;
}
