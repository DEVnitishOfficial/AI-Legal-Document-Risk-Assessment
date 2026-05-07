import { useDispatch } from 'react-redux'
import { loginUser } from '../features/auth/authSlice'
import { useState } from 'react'

export default function Login () {
  const dispatch = useDispatch<any>()

  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  const handleLogin = () => {
    console.log("Attempting login with form data:", form);
    dispatch(loginUser(form))
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-950 text-white'>
      <div className='bg-gray-900 p-8 rounded-xl w-[400px]'>
        <h2 className='text-2xl font-bold mb-6'>Login</h2>

        <input
          type='email'
          placeholder='Email'
          className='w-full mb-4 p-3 rounded bg-gray-800'
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <input
          type='password'
          placeholder='Password'
          className='w-full mb-4 p-3 rounded bg-gray-800'
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        <button
          onClick={handleLogin}
          className='w-full bg-purple-600 p-3 rounded mb-4'
        >
          Login
        </button>

        <div className='text-center text-gray-400 mb-4'>OR</div>

        <button
          onClick={() =>
            (window.location.href = 'http://localhost:3000/api/v1/auth/google')
          }
          className='w-full bg-white text-black p-3 rounded'
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}
