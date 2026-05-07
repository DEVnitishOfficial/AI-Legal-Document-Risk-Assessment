import { useState } from "react";
import { Link } from "react-router-dom";
import { registerUser } from "../features/auth/authSlice";
import { useDispatch } from "react-redux";

export default function Register() {

const dispatch = useDispatch<any>();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  })

const handleRegister = () => {
  console.log("Attempting registration with form data:", form);
  dispatch(registerUser(form))
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="bg-gray-900 p-8 rounded-xl w-[400px]">
        <h2 className="text-2xl font-bold mb-6">Register</h2>

        <input
          type="text"
          placeholder="Name"
          className="w-full mb-4 p-3 rounded bg-gray-800"
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-3 rounded bg-gray-800"
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-3 rounded bg-gray-800"
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        <button 
        onClick={handleRegister}
        className="w-full bg-purple-600 p-3 rounded mb-4">
          Register
        </button>

        <p className="text-sm text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-400">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}