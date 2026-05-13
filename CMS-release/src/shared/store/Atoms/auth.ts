import { atom } from "recoil";
import { recoilPersist } from "recoil-persist";
import { AuthAtomType } from "@/shared/types/auth";

const storage = typeof window !== "undefined" ? sessionStorage : undefined;

const { persistAtom } = recoilPersist({
  key: "authState",
  storage,
});

export const authState = atom<AuthAtomType>({
  key: "authState",
  default: {
    isLoggedIn: false,
    user: null,
    accessToken: undefined,
  },
  effects_UNSTABLE: [persistAtom],
});

export const emailAtom = atom<string>({
  key: "emailState",
  default: "",
});
