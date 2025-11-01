"use client";

import { useMutation as convexUseMutation, useQuery as convexUseQuery } from "convex/react";

type AnyRecord = Record<string, unknown>;

type ConvexQueryReference = Parameters<typeof convexUseQuery>[0];
type ConvexQueryArgs = Parameters<typeof convexUseQuery>[1];
type ConvexMutationReference = Parameters<typeof convexUseMutation>[0];

export function useConvexQuery<T = unknown>(name: string, args: AnyRecord = {}) {
  return convexUseQuery(
    name as unknown as ConvexQueryReference,
    args as ConvexQueryArgs,
  ) as T | undefined;
}

export function useConvexMutation<TArgs extends AnyRecord = AnyRecord, TResult = unknown>(
  name: string,
) {
  const mutation = convexUseMutation(name as unknown as ConvexMutationReference);
  return mutation as unknown as (args: TArgs) => Promise<TResult>;
}
