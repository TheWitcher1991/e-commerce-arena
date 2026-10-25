"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ArenaSession } from "@/entities/session";
import { createTeacherSession } from "@/entities/session";

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation<ArenaSession, Error, string>({
    mutationFn: async (title) => {
      const name = title.trim();
      if (name.length < 3 || name.length > 80) throw new Error("Название должно содержать от 3 до 80 символов.");
      return createTeacherSession(name);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-sessions"] }),
  });
}
