"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TeamMembership } from "@/entities/team";
import { setAccessToken } from "@/shared/api";
import { joinTeam } from "../api/join-team";

export function useJoinTeam(code: string, participantName: string) {
  const queryClient = useQueryClient();
  return useMutation<TeamMembership, Error, void>({
    mutationFn: async () => {
      const response = await joinTeam(code, participantName);
      return {
        teamId: response.team_id,
        teamName: response.team_name,
        memberId: response.member_id,
        memberName: response.member_name,
        sessionId: response.session_id,
        sessionTitle: response.session_title,
        accessToken: response.access_token,
        expiresIn: response.expires_in,
      };
    },
    onSuccess: (membership) => {
      setAccessToken(membership.accessToken);
      queryClient.setQueryData(["team", "me"], null);
    },
  });
}
