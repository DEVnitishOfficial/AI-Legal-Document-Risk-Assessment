import { useDispatch } from 'react-redux'
import { loginUser } from '../features/auth/authSlice'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion' // Added for smooth animations
import { toast } from 'react-hot-toast'

export default function Login () {
  const dispatch = useDispatch<any>()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  // Production addition: track loading and error states locally
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

const handleLogin = async () => {
  if (!form.email || !form.password) {
    setError("Please fill in all fields.");
    return;
  }

  try {
    setIsLoading(true);
    setError(null);

    await dispatch(loginUser(form)).unwrap();

    toast.success("Login successful!");

    // ✅ IMPORTANT: don't manually reset loading after navigation
    navigate("/dashboard");

  } catch (err: any) {
    setError(err?.message || "Invalid email or password. Please try again.");
    setIsLoading(false); // only reset on error
  }
};

  return (
    // Framer motion container for a smooth fade-in of the entire screen on mount
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className='min-h-screen flex items-center justify-center bg-gray-950 text-white'
    >
      {/* Smooth scaling and fade for the card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
        className='bg-gray-900 p-8 rounded-xl w-[400px] border border-gray-800 shadow-2xl'
      >
        <h2 className='text-2xl font-bold mb-6'>Login</h2>
        {/* Dynamic Error Message Box */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='text-sm text-red-400 bg-red-950/50 border border-red-800/50 p-3 rounded mb-4 overflow-hidden'
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <input
          type='email'
          disabled={isLoading}
          placeholder='Email'
          className='w-full mb-4 p-3 rounded bg-gray-800 border border-transparent focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50'
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
        <input
          type='password'
          disabled={isLoading}
          placeholder='Password'
          className='w-full mb-4 p-3 rounded bg-gray-800 border border-transparent focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50'
          onChange={e => setForm({ ...form, password: e.target.value })}
        />
        {/* Animated Login Button with Loading Spinner */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className='w-full bg-purple-600 hover:bg-purple-700 active:scale-[0.98] p-3 rounded mb-4 font-semibold transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none'
        >
          {isLoading ? (
            <svg
              className='animate-spin h-5 w-5 text-white'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
            >
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
              ></circle>
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
              ></path>
            </svg>
          ) : (
            'Login'
          )}
        </button>
         {/* if user doesn't have an account, they can register */}
        <p className='text-sm text-center mb-4'>
          Don't have an account?{' '}
          <span
            onClick={() => navigate('/register')}
            className='text-purple-400 hover:underline cursor-pointer'
          >
            Register
          </span>
        </p>
        <div className='text-center text-gray-400 mb-4 text-sm'>OR</div>
        <button
          onClick={() =>
            (window.location.href = 'http://localhost:3000/api/v1/auth/google')
          }
          disabled={isLoading}
          className='w-full bg-white hover:bg-gray-100 text-black p-3 rounded font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
        >
          Continue with Google
        </button>
      </motion.div>
    </motion.div>
  )
}
