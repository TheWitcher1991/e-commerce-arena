import type { ArenaRound, ArenaSession, AudienceScreen, LeaderInvite, SessionAuditEvent, SessionDetail, SessionTeam, TeamAssessment, TeamRoundResult } from "../model/types";
import { apiRequest, apiRequestBlob } from "@/shared/api";

type ApiSession = { id: string; title: string; course: string; status: "draft" | "active" | "paused" | "completed"; current_round: number; team_count: number; created_at: string; scenario_version: string };
type ApiSessionDetail = ApiSession & { teams: SessionTeam[]; leader_invites: LeaderInvite[]; rounds: ArenaRound[]; crisis: { event_type: string; activated_at: string } | null };

function mapSession(session: ApiSession): ArenaSession {
  const date = new Date(session.created_at);
  return {
    id: session.id,
    title: session.title,
    course: session.course,
    dateLabel: date.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
    teams: session.team_count,
    submitted: 0,
    round: session.current_round,
    status: session.status === "active" ? "В процессе" : session.status === "paused" ? "На паузе" : session.status === "completed" ? "Завершена" : "Запланирована",
    backendStatus: session.status,
    currentRound: session.current_round,
  };
}

export async function getTeacherSessions(): Promise<ArenaSession[]> {
  const sessions = await apiRequest<ApiSession[]>("/sessions");
  return sessions.map(mapSession);
}

export async function createTeacherSession(title: string): Promise<SessionDetail> {
  const response = await apiRequest<ApiSessionDetail>("/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return { ...mapSession(response), teamsList: response.teams, leaderInvites: response.leader_invites, rounds: response.rounds, crisis: response.crisis };
}

export async function getTeacherSession(sessionId: string): Promise<SessionDetail> {
  const response = await apiRequest<ApiSessionDetail>(`/sessions/${sessionId}`);
  return { ...mapSession(response), teamsList: response.teams, leaderInvites: response.leader_invites, rounds: response.rounds, crisis: response.crisis };
}

export async function startTeacherSession(sessionId: string): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/start`, { method: "POST" });
}

export async function pauseTeacherSession(sessionId: string): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/pause`, { method: "POST" });
}

export async function resumeTeacherSession(sessionId: string): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/resume`, { method: "POST" });
}

export async function openTeacherRound(sessionId: string, roundNumber: number, durationSeconds = 600): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/rounds/${roundNumber}/open`, {
    method: "POST",
    body: JSON.stringify({ duration_seconds: durationSeconds }),
  });
}

export async function lockTeacherRound(sessionId: string, roundNumber: number): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/rounds/${roundNumber}/lock`, { method: "POST" });
}

export async function activateSessionCrisis(sessionId: string): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/crises`, {
    method: "POST",
    body: JSON.stringify({ event_type: "ads_cpc_spike_40" }),
  });
}

export async function publishSessionResults(sessionId: string): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/results/publish`, { method: "POST" });
}

export async function saveTeamAssessment(sessionId: string, assessment: {
  team_id: string; economics_score: number; technology_score: number; crisis_score: number;
  teamwork_score: number; reflection_score: number; comment: string;
}): Promise<unknown> {
  return apiRequest(`/sessions/${sessionId}/assessments`, { method: "PUT", body: JSON.stringify(assessment) });
}

export async function downloadSessionExport(sessionId: string): Promise<void> {
  const blob = await apiRequestBlob(`/sessions/${sessionId}/export.csv`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `e-commerce-arena-${sessionId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function getSessionAudit(sessionId: string) {
  return apiRequest<SessionAuditEvent[]>(`/sessions/${sessionId}/audit`);
}

export function getSessionAssessments(sessionId: string) {
  return apiRequest<TeamAssessment[]>(`/sessions/${sessionId}/assessments`);
}

export function getSessionRoundResults(sessionId: string, roundNumber: number) {
  return apiRequest<TeamRoundResult[]>(`/sessions/${sessionId}/rounds/${roundNumber}/results`);
}

export function getAudienceScreen(sessionId: string) {
  return apiRequest<AudienceScreen>(`/public/sessions/${sessionId}/screen`);
}
