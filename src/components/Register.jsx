import { useState } from 'react'
import apiClient from '../api/axiosConfig'
import { Link, useNavigate } from 'react-router-dom'

const Register = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne')
      return
    }

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      return
    }

    setLoading(true)

    try {
      const response = await apiClient.post('/user/register', {
        username,
        email,
        password
      })

      if (response.data && response.data.success) {
        setSuccess(response.data.message)
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setError(response.data?.message || 'Błąd rejestracji')
      }
    } catch (err) {
      console.error('Register error:', err)
      if (err.response) {
        const errorData = err.response.data
        if (errorData && typeof errorData === 'object' && errorData.message) {
          setError(errorData.message)
        } else if (typeof errorData === 'string') {
          setError(errorData)
        } else {
          setError('Wystąpił błąd podczas rejestracji')
        }
      } else {
        setError('Nie można połączyć się z serwerem')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 safe-area-inset">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2 text-center">SMB File Manager</h1>
        <h2 className="text-lg sm:text-xl text-gray-600 mb-6 text-center">Rejestracja</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 sm:mb-5">
            <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700">
              Nazwa użytkownika
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-base touch-manipulation min-h-[44px]"
            />
          </div>
          <div className="mb-4 sm:mb-5">
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-base touch-manipulation min-h-[44px]"
            />
          </div>
          <div className="mb-4 sm:mb-5">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
              Hasło
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-base touch-manipulation min-h-[44px]"
            />
          </div>
          <div className="mb-4 sm:mb-5">
            <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-700">
              Potwierdź hasło
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-base touch-manipulation min-h-[44px]"
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm text-center">
              {success}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] shadow-lg text-base touch-manipulation min-h-[44px]"
          >
            {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-3">
            Masz już konto?
          </p>
          <Link
            to="/login"
            className="text-blue-700 hover:text-blue-800 font-semibold underline touch-manipulation min-h-[44px] inline-flex items-center"
          >
            Zaloguj się
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register

