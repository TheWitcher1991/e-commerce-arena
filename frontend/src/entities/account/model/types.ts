export type AccountRole = "teacher" | "leader";

export type Account = {
  id: string;
  email: string;
  full_name: string;
  role: AccountRole;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: Account;
};
