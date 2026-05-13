import { ReactNode, useEffect } from "react";
import { useRecoilValue } from "recoil";
import { authState } from "@/shared/store/Atoms/auth";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  requiredRole?: "ADMIN" | "STAFF";
  allowedRoles?: ("ADMIN" | "STAFF")[];
  children: ReactNode;
}

const ProtectedRoute = ({ requiredRole, allowedRoles, children }: ProtectedRouteProps) => {
  const auth = useRecoilValue(authState);
  const router = useRouter();

  useEffect(() => {
    const userRole = auth?.user?.role;
    if (!userRole) return;

    if (allowedRoles) {
      if (!allowedRoles.includes(userRole as any)) {
        router.replace("/unauthorized");
      }
    } else if (requiredRole) {
      if (userRole !== requiredRole) {
        router.replace("/unauthorized");
      }
    }
  }, [auth?.user?.role, requiredRole, allowedRoles, router]);

  const userRole = auth?.user?.role;
  let hasAccess = false;
  
  if (allowedRoles && userRole) {
    hasAccess = allowedRoles.includes(userRole as any);
  } else if (requiredRole && userRole) {
    hasAccess = userRole === requiredRole;
  }

  return hasAccess ? <>{children}</> : null;
};

export default ProtectedRoute;
