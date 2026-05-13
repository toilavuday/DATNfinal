import { Employees } from "@/shared/types/user";
import { atom } from "recoil";

export const usersState = atom<Employees[]>({
  key: "usersState",
  default: [],
});
