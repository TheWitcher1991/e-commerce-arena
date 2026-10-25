import type { ArenaTeam, TeamCurrent } from "../model/types";
import { apiRequest } from "@/shared/api";
import { getTeacherSession } from "@/entities/session";
import type { MetricValues } from "@/entities/session";

export async function getSessionTeams(sessionId: string): Promise<ArenaTeam[]> {
  const session = await getTeacherSession(sessionId);
  return session.teamsList.map((team) => ({ id: team.id, name: team.name, leader: team.leader_name, members: team.member_count + 1, submitted: team.submitted, inviteCode: team.invite_code }));
}

export function joinSessionAsLeader(joinCode: string, teamName: string) {
  return apiRequest<{ team_id: string; team_name: string; invite_code: string; session_id: string; session_title: string }>("/sessions/join", {
    method: "POST",
    body: JSON.stringify({ join_code: joinCode, team_name: teamName }),
  });
}

export function joinTeamAsParticipant(inviteCode: string, displayName: string) {
  return apiRequest<{ team_id: string; team_name: string; session_id: string; session_title: string; member_id: string; member_name: string; access_token: string; expires_in: number }>("/teams/join", {
    method: "POST",
    body: JSON.stringify({ invite_code: inviteCode, display_name: displayName }),
  });
}

export function getCurrentTeam(sessionId?: string) {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  return apiRequest<TeamCurrent>(`/teams/me${query}`);
}

export function getTeamDefenseCard(sessionId?: string) {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  return apiRequest<{
    session_id: string; session_title: string; team_id: string; team_name: string; leader_name: string;
    rounds: Array<{ round_number: number; round_status: string; published: boolean; crisis_title: string | null; decision: Record<string, unknown> | null; metrics: MetricValues | null }>;
    defense_questions: string[];
  }>(`/teams/me/defense-card${query}`);
}
