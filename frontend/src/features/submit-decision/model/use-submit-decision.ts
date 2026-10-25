"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveTeamDecision } from "./submit-decision";

export function useSubmitTeamDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveTeamDecision,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["team", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["team-defense-card"] }),
        queryClient.invalidateQueries({ queryKey: ["audience-screen"] }),
        queryClient.invalidateQueries({ queryKey: ["teacher-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["teacher-session"] }),
      ]);
    },
  });
}
