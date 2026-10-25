export type ArenaTeam = { id: string; name: string; leader: string; members: number; submitted: boolean; inviteCode: string };
export type TeamMembership = { teamId: string; teamName: string; memberId: string; memberName: string; sessionId: string; sessionTitle: string; accessToken: string; expiresIn: number };
export type TeamCurrent = {
  team_id: string;
  team_name: string;
  leader_name: string;
  session_id: string;
  session_title: string;
  session_status: "draft" | "active" | "paused" | "completed";
  current_round: number;
  round_status: "pending" | "open" | "locked" | null;
  round_deadline_at: string | null;
  members: Array<{ id: string; display_name: string; joined_at: string }>;
  can_submit_decision: boolean;
};
