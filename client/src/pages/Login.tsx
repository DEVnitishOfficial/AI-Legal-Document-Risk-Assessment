import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="bg-gray-900 p-8 rounded-xl w-[400px]">
        <h2 className="text-2xl font-bold mb-6">Login</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-3 rounded bg-gray-800"
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-3 rounded bg-gray-800"
        />

        <button className="w-full bg-purple-600 p-3 rounded mb-4">
          Login
        </button>

        {/* Divider */}
        <div className="text-center text-gray-400 mb-4">OR</div>

        {/* Google Login */}
        <button className="w-full bg-white text-black p-3 rounded">
          Continue with Google
        </button>

        <p className="text-sm mt-4 text-center">
          Don’t have an account?{" "}
          <Link to="/register" className="text-purple-400">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}