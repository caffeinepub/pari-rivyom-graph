import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Point, Region } from "../backend.d";
import { useActor } from "./useActor";

export function usePoints() {
  const { actor, isFetching } = useActor();
  return useQuery<Point[]>({
    queryKey: ["points"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPoints();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRegions() {
  const { actor, isFetching } = useActor();
  return useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRegions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPoint() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      x,
      y,
    }: {
      name: string;
      x: number;
      y: number;
    }) => {
      if (!actor) throw new Error("No actor available");
      return actor.addPoint(name, x, y);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

export function useDeletePoint() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor available");
      return actor.deletePoint(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

export function useAddRegion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      x,
      y,
      width,
      height,
    }: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      if (!actor) throw new Error("No actor available");
      return actor.addRegion(name, x, y, width, height);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
    },
  });
}

export function useDeleteRegion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor available");
      return actor.deleteRegion(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
    },
  });
}
