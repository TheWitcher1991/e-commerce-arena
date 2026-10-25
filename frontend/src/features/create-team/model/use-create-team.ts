"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinSessionAsLeader } from "@/entities/team";

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { joinCode: string; teamName: string }) => joinSessionAsLeader(input.joinCode, input.teamName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-sessions"] }),
  });
}
