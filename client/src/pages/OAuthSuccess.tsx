import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchCurrentUser } from "../features/auth/authSlice";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      dispatch(fetchCurrentUser()).finally(() => navigate("/dashboard"));
    } else {
      navigate("/login");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      Logging you in...
    </div>
  );
}
