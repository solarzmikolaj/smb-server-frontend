import { useState, useEffect } from 'react'
import apiClient from '../api/axiosConfig'
import { Link } from 'react-router-dom'

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.post('/user/login', {
        username,
        password,
        twoFactorCode: requiresTwoFactor ? twoFactorCode : null
      })

      if (response.data && response.data.success) {
        // Zapisz również informacje o użytkowniku
        localStorage.setItem('user', JSON.stringify(response.data.user))
        onLogin(response.data.token, response.data.user)
        // Resetuj stan 2FA
        setRequiresTwoFactor(false)
        setTwoFactorCode('')
      } else if (response.data && response.data.requiresTwoFactor) {
        // Wymagany kod 2FA
        setRequiresTwoFactor(true)
        setError(response.data.message || 'Wprowadź kod 2FA')
      } else {
        setError(response.data?.message || 'Błąd logowania')
      }
    } catch (err) {
      // Lepsze logowanie błędów
      console.error('Login error:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        } : null,
        request: err.request ? {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
          fullURL: `${err.config?.baseURL}${err.config?.url}`
        } : null,
        config: err.config ? {
          url: err.config.url,
          baseURL: err.config.baseURL,
          method: err.config.method
        } : null
      })
      
      if (err.response) {
        const errorData = err.response.data
        if (errorData && typeof errorData === 'object') {
          if (errorData.requiresTwoFactor) {
            setRequiresTwoFactor(true)
            setError(errorData.message || 'Wprowadź kod 2FA')
          } else if (errorData.message) {
            setError(errorData.message)
          } else {
            setError('Nieprawidłowa nazwa użytkownika lub hasło')
          }
        } else if (typeof errorData === 'string') {
          setError(errorData)
        } else {
          setError('Nieprawidłowa nazwa użytkownika lub hasło')
        }
      } else if (err.request) {
        setError('Nie można połączyć się z serwerem. Sprawdź czy backend działa.')
      } else {
        setError('Wystąpił błąd podczas logowania: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 safe-area-inset">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2 text-center">SMB File Manager</h1>
        <h2 className="text-lg sm:text-xl text-gray-600 mb-6 text-center">Logowanie</h2>
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
              className="w-full px-4 py-3 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-base touch-manipulation min-h-[44px]"
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
              disabled={loading || requiresTwoFactor}
              autoComplete="current-password"
              className="w-full px-4 py-3 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-base touch-manipulation min-h-[44px]"
            />
          </div>
          {requiresTwoFactor && (
            <div className="mb-4 sm:mb-5">
              <label htmlFor="twoFactorCode" className="block mb-2 text-sm font-medium text-gray-700">
                Kod 2FA
              </label>
              <input
                type="text"
                id="twoFactorCode"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={loading}
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-base touch-manipulation min-h-[44px] text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">Wprowadź 6-cyfrowy kod z aplikacji autoryzacyjnej</p>
            </div>
          )}
          {error && (
            <div className={`mb-4 p-3 rounded-lg text-sm text-center ${
              requiresTwoFactor 
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] shadow-lg text-base touch-manipulation min-h-[44px]"
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-3">
            Nie masz konta?
          </p>
          <Link
            to="/register"
            className="text-blue-700 hover:text-blue-800 font-semibold underline touch-manipulation min-h-[44px] inline-flex items-center"
          >
            Zarejestruj się
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
