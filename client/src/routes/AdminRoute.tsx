import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

// Client-side convenience only — every admin API call is authorized by the
// server, which re-checks the role in the database.
export default function AdminRoute({ children }: any) {
  const token = localStorage.getItem("token");
  const user = useSelector((state: any) => state.auth.user);

  if (!token) return <Navigate to="/login" replace />;

  // App.tsx fetches the profile on load; until it arrives we can't know the role.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-navy-950 text-gray-500 dark:text-cream-100/50 text-sm">
        Checking access…
      </div>
    );
  }

  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;

  return children;
}
