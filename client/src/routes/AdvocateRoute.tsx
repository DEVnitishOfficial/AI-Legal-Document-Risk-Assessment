import { Navigate } from "react-router-dom";
import { useAdvocateAccount } from "../features/human/useAdvocateAccount";

// Client-side convenience only — every Advocate Desk API call is authorized by the
// server, which checks that the account is linked to an advocate profile.
export default function AdvocateRoute({ children }: any) {
  const token = localStorage.getItem("token");
  const { advocate, loading } = useAdvocateAccount();

  if (!token) return <Navigate to="/login" replace />;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-navy-950 text-gray-500 dark:text-cream-100/50 text-sm">
        Checking access…
      </div>
    );
  }
  if (!advocate) return <Navigate to="/dashboard" replace />;
  return children;
}
