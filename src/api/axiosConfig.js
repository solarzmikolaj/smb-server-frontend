import axios from 'axios'

// Funkcja do określenia baseURL
// W trybie deweloperskim (Vite dev server) używamy proxy '/api'
// W produkcji używamy bezpośredniego URL z zmiennej środowiskowej lub domyślnego
const getBaseURL = () => {
  // Jeśli jesteśmy w trybie deweloperskim (Vite dev server)
  if (import.meta.env.DEV) {
    // W dev mode używamy proxy Vite
    return '/api'
  }
  
  // W produkcji używamy zmiennej środowiskowej lub domyślnego URL
  const apiUrl = import.meta.env.VITE_API_URL
  
  if (apiUrl) {
    // Jeśli URL jest pełny (z http/https), użyj go bezpośrednio
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      return apiUrl
    }
    // Jeśli jest względny, dodaj /api
    return apiUrl.startsWith('/') ? apiUrl : `/${apiUrl}`
  }
  
  // Domyślnie w produkcji próbuj użyć tego samego hosta z portem backendu
  const hostname = window.location.hostname
  const protocol = 'http:'
  const port = '5087'
  
  // Dla localhost użyj localhost, dla innych użyj hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${port}/api`
  }
  
  // Dla sieci lokalnej - użyj tego samego hostname z HTTPS
  return `${protocol}//${hostname}:${port}/api`
}

// Konfiguracja axios z baseURL wskazującym na backend
const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 sekund timeout
})

// Interceptor do dodawania tokena do żądań
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Usuń Content-Type dla FormData (axios ustawi to automatycznie z boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    // Logowanie w trybie deweloperskim
    if (import.meta.env.DEV) {
      console.log('[API Request]', config.method?.toUpperCase(), config.url, {
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
      })
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor do obsługi błędów
apiClient.interceptors.response.use(
  (response) => {
    // Logowanie w trybie deweloperskim
    if (import.meta.env.DEV) {
      console.log('[API Response]', response.status, response.config.url)
    }
    return response
  },
  (error) => {
    // Lepsze logowanie błędów
    if (import.meta.env.DEV) {
      console.error('[API Error]', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })
    }
    
    // Jeśli błąd sieci (brak odpowiedzi), wyświetl bardziej pomocny komunikat
    if (!error.response) {
      const baseURL = error.config?.baseURL || 'backend'
      error.message = `Nie można połączyć się z serwerem (${baseURL}). Sprawdź czy backend działa i czy adres jest poprawny.`
    }
    
    return Promise.reject(error)
  }
)

export default apiClient

