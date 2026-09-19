import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }: any) {
  const token = localStorage.getItem("token");
  const loggedOut = useSelector((state: any) => state.auth.loggedOut);

  // No token because the user just logged out → back to the public home page.
  // No token on a fresh visit → they need to sign in.
  if (!token) return <Navigate to={loggedOut ? "/" : "/login"} replace />;

  return children;
}
