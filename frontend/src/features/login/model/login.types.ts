import { Member } from "../../../shared/types";

export type LoginRole = "admin" | "speaker" | "member";

export interface LoginCredentials {
  role: LoginRole;
  usernameOrId: string;
  password: string;
}

export interface LoginValidationResult {
  isValid: boolean;
  errorMessage: string | null;
  member?: Member;
}
