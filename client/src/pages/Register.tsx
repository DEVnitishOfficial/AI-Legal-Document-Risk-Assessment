import { useState } from "react";
import { registerUser } from "../features/auth/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import AuthShell from "../features/auth/AuthShell";
import CaseFileCard from "../features/auth/CaseFileCard";
import AuthField from "../features/auth/AuthField";
import { API_BASE_URL } from "../services/api";

export default function Register() {
    const navigate = useNavigate();
    const dispatch = useDispatch<any>();

    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async () => {
        if (!form.name || !form.email || !form.password || !form.confirmPassword) {
            setError("Please fill in all required fields.");
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError("Passwords don't match.");
            return;
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (!agreed) {
            setError("Please agree to the Terms and Privacy Policy to continue.");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            await dispatch(
                registerUser({
                    name: form.name,
                    email: form.email,
                    phone: form.phone || undefined,
                    password: form.password,
                })
            ).unwrap();

            toast.success("Account created — please sign in.");
            navigate("/login");
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Registration failed. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            headline={
                <>
                    Open your first <em className="text-gold-500 font-medium italic">case file</em> in minutes.
                </>
            }
            subtitle="Create an account to upload documents, track past analyses, and pick up conversations with your AI legal assistant right where you left off."
        >
            <CaseFileCard fileTag="New file — awaiting details">
                <h2 className="font-display text-2xl font-medium text-navy-900 dark:text-white mb-1">
                    Create your account
                </h2>
                <p className="text-sm text-gray-500 dark:text-cream-100/50 mb-6">
                    Set up your workspace to start analyzing documents.
                </p>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-800/50 p-3 rounded-lg mb-4 overflow-hidden"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AuthField
                    label="Full name"
                    value={form.name}
                    disabled={isLoading}
                    placeholder="As per your ID"
                    autoComplete="name"
                    onChange={(v) => setForm({ ...form, name: v })}
                />
                <AuthField
                    label="Email address"
                    type="email"
                    value={form.email}
                    disabled={isLoading}
                    placeholder="you@example.com"
                    autoComplete="email"
                    onChange={(v) => setForm({ ...form, email: v })}
                />
                <AuthField
                    label="Mobile number"
                    type="tel"
                    value={form.phone}
                    disabled={isLoading}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    onChange={(v) => setForm({ ...form, phone: v })}
                />
                <AuthField
                    label="Password"
                    isPassword
                    value={form.password}
                    disabled={isLoading}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    onChange={(v) => setForm({ ...form, password: v })}
                />
                <AuthField
                    label="Confirm password"
                    isPassword
                    value={form.confirmPassword}
                    disabled={isLoading}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    onChange={(v) => setForm({ ...form, confirmPassword: v })}
                />

                <label className="flex items-start gap-2.5 mb-6 text-sm text-gray-600 dark:text-cream-100/60 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="accent-gold-600 mt-0.5 shrink-0"
                    />
                    <span>
                        I agree to the{" "}
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toast("Terms page coming soon.", { icon: "🚧" });
                            }}
                            className="text-gold-600 dark:text-gold-400 hover:underline cursor-pointer"
                        >
                            Terms
                        </span>{" "}
                        and{" "}
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toast("Privacy Policy page coming soon.", { icon: "🚧" });
                            }}
                            className="text-gold-600 dark:text-gold-400 hover:underline cursor-pointer"
                        >
                            Privacy Policy
                        </span>
                        , and understand NyayMitra provides AI-generated information, not legal advice.
                    </span>
                </label>

                <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 active:scale-[0.98] py-3 rounded-lg mb-5 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    ) : (
                        "Create account"
                    )}
                </button>

                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-cream-200 dark:bg-white/10" />
                    <span className="text-xs text-gray-400 dark:text-cream-100/40">or continue with</span>
                    <div className="flex-1 h-px bg-cream-200 dark:bg-white/10" />
                </div>

                <button
                    onClick={() => (window.location.href = `${API_BASE_URL}/auth/google`)}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-cream-50 text-navy-900 py-3 rounded-lg font-semibold border border-cream-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-5"
                >
                    <GoogleIcon />
                    Continue with Google
                </button>

                <p className="text-sm text-center mb-6 text-gray-500 dark:text-cream-100/50">
                    Already have an account?{" "}
                    <span
                        onClick={() => navigate("/login")}
                        className="text-gold-600 dark:text-gold-400 hover:underline cursor-pointer font-medium"
                    >
                        Sign in
                    </span>
                </p>

                <div className="text-xs text-amber-900/80 bg-amber-50 border border-amber-200 dark:text-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50 rounded-lg p-3">
                    <strong>Please note:</strong> analysis and guidance provided after sign-up are generated by AI
                    for informational purposes only and do not constitute legal advice. Always confirm important
                    decisions with a licensed advocate.
                </div>
            </CaseFileCard>
        </AuthShell>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 000 12c0 1.93.46 3.76 1.29 5.38l3.98-3.09z"
            />
            <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
            />
        </svg>
    );
}
