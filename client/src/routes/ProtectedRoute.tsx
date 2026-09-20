import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }: any) {
  const token = localStorage.getItem("token");
  const loggedOut = useSelector((state: any) => state.auth.loggedOut);
  const expired = useSelector((state: any) => state.auth.sessionExpired);
  // Subscribed only so this re-renders (and redirects) the moment the token is cleared.
  useSelector((state: any) => state.auth.token);

  // No token because the user just logged out → back to the public home page.
  // No token on a fresh visit → they need to sign in; if the server rejected a saved
  // token, the sign-in page is told so it can explain why.
  if (!token) {
    return <Navigate to={loggedOut ? "/" : "/login"} replace state={expired ? { reason: "expired" } : undefined} />;
  }

  return children;
}
