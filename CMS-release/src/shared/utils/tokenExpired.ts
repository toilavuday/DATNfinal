import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  exp: number;
}

export function isTokenExpired(token: string | undefined): boolean {
  if (!token) {
    return true;
  }

  const decoded: DecodedToken = jwtDecode(token);
  const currentTime = Math.floor(Date.now() / 1000);

  return decoded.exp < currentTime;
}
