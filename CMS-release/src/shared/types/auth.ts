import { Employees } from "./user";

export interface ILoginRequest {
  email: string;
  password: string;
}
export type AuthAtomType = {
  isLoggedIn: boolean;
  accessToken: string | undefined;
  remember?: boolean;
  user: Employees | null;
};
export interface ResetPasswordResponse {
  message: string;
  code: number;
}
