import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/axiosConfig'

const Settings = ({ onLogout, user }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('general')
  const [notification, setNotification] = useState(null)

  // Ustawienia ogólne
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('settings_pageSize')
    return saved ? parseInt(saved) : 50
  })
  const [showChecksumButton, setShowChecksumButton] = useState(() => {
    const saved = localStorage.getItem('settings_showChecksumButton')
    return saved !== null ? saved === 'true' : true
  })
  const [defaultView, setDefaultView] = useState(() => {
    const saved = localStorage.getItem('settings_defaultView')
    return saved || 'cards'
  })
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('settings_autoRefresh')
    return saved !== null ? saved === 'true' : false
  })
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('settings_autoRefreshInterval')
    return saved ? parseInt(saved) : 30
  })
  const [showFileIcons, setShowFileIcons] = useState(() => {
    const saved = localStorage.getItem('settings_showFileIcons')
    return saved !== null ? saved === 'true' : true
  })
  const [compactMode, setCompactMode] = useState(() => {
    const saved = localStorage.getItem('settings_compactMode')
    return saved !== null ? saved === 'true' : false
  })

  // Ustawienia wyświetlania
  const [dateFormat, setDateFormat] = useState(() => {
    const saved = localStorage.getItem('settings_dateFormat')
    return saved || 'relative'
  })
  const [sizeFormat, setSizeFormat] = useState(() => {
    const saved = localStorage.getItem('settings_sizeFormat')
    return saved || 'auto'
  })
  const [sortBy, setSortBy] = useState(() => {
    const saved = localStorage.getItem('settings_sortBy')
    return saved || 'date'
  })
  const [sortOrder, setSortOrder] = useState(() => {
    const saved = localStorage.getItem('settings_sortOrder')
    return saved || 'desc'
  })

  // Ustawienia bezpieczeństwa
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // 2FA settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState('')
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)


  // Admin panel state
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')
  const [editingQuota, setEditingQuota] = useState(null)
  const [quotaValue, setQuotaValue] = useState('')
  const [userQuotas, setUserQuotas] = useState({})

  // Zapisz ustawienia do localStorage
  useEffect(() => {
    localStorage.setItem('settings_pageSize', pageSize.toString())
  }, [pageSize])

  useEffect(() => {
    localStorage.setItem('settings_showChecksumButton', showChecksumButton.toString())
  }, [showChecksumButton])

  useEffect(() => {
    localStorage.setItem('settings_defaultView', defaultView)
  }, [defaultView])

  useEffect(() => {
    localStorage.setItem('settings_autoRefresh', autoRefresh.toString())
  }, [autoRefresh])

  useEffect(() => {
    localStorage.setItem('settings_autoRefreshInterval', autoRefreshInterval.toString())
  }, [autoRefreshInterval])

  useEffect(() => {
    localStorage.setItem('settings_showFileIcons', showFileIcons.toString())
  }, [showFileIcons])

  useEffect(() => {
    localStorage.setItem('settings_compactMode', compactMode.toString())
  }, [compactMode])

  useEffect(() => {
    localStorage.setItem('settings_dateFormat', dateFormat)
  }, [dateFormat])

  useEffect(() => {
    localStorage.setItem('settings_sizeFormat', sizeFormat)
  }, [sizeFormat])

  useEffect(() => {
    localStorage.setItem('settings_sortBy', sortBy)
  }, [sortBy])

  useEffect(() => {
    localStorage.setItem('settings_sortOrder', sortOrder)
  }, [sortOrder])

  // Admin panel effects
  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'Admin') {
      fetchPendingUsers()
      fetchAllUsers()
    }
  }, [activeTab, user])

  const fetchPendingUsers = async () => {
    setAdminLoading(true)
    try {
      const response = await apiClient.get('/user/pending')
      setPendingUsers(response.data || [])
    } catch (err) {
      console.error('Error fetching pending users:', err)
      setAdminError('Nie udało się pobrać listy użytkowników oczekujących')
    } finally {
      setAdminLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const response = await apiClient.get('/user/all')
      const users = response.data || []
      setAllUsers(users)
      
      // Pobierz użycie quota dla każdego użytkownika (jeśli ma quota)
      const quotas = {}
      for (const user of users) {
        if (user.storageQuota) {
          quotas[user.id] = {
            quota: user.storageQuota,
            used: 0, // TODO: obliczyć rzeczywiste użycie
            remaining: user.storageQuota,
            percentUsed: 0
          }
        }
      }
      setUserQuotas(quotas)
    } catch (err) {
      console.error('Error fetching all users:', err)
    }
  }

  const handleApprove = async (userId) => {
    setAdminError('')
    setAdminSuccess('')
    try {
      await apiClient.post(`/user/approve/${userId}`)
      setAdminSuccess('Konto zostało zatwierdzone i folder SMB został utworzony')
      fetchPendingUsers()
      fetchAllUsers()
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas zatwierdzania konta'
      setAdminError(errorMessage)
    }
  }

  const handleSetQuota = async (userId) => {
    setAdminError('')
    setAdminSuccess('')
    try {
      const quotaBytes = quotaValue.trim() === '' ? 0 : parseQuotaInput(quotaValue)
      await apiClient.post(`/user/quota/${userId}`, {
        quotaBytes: quotaBytes
      })
      setAdminSuccess(`Quota została ustawiona dla użytkownika`)
      setEditingQuota(null)
      setQuotaValue('')
      await fetchAllUsers()
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas ustawiania quota'
      setAdminError(errorMessage)
    }
  }

  const parseQuotaInput = (input) => {
    const trimmed = input.trim().toUpperCase()
    if (!trimmed) return 0
    
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i)
    if (!match) return 0
    
    const value = parseFloat(match[1])
    const unit = match[2] || 'B'
    
    const multipliers = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    }
    
    return Math.floor(value * (multipliers[unit] || 1))
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Pobierz status 2FA przy załadowaniu
  useEffect(() => {
    const fetchTwoFactorStatus = async () => {
      try {
        const response = await apiClient.get('/user/two-factor/status')
        if (response.data) {
          setTwoFactorEnabled(response.data.enabled)
        }
      } catch (err) {
        console.error('Error fetching 2FA status:', err)
      }
    }
    fetchTwoFactorStatus()
  }, [])


  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    
    if (newPassword.length < 6) {
      showNotification('error', 'Nowe hasło musi mieć co najmniej 6 znaków')
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification('error', 'Nowe hasła nie są identyczne')
      return
    }

    setChangingPassword(true)
    try {
      const response = await apiClient.post('/user/change-password', {
        currentPassword: currentPassword,
        newPassword: newPassword
      })

      if (response.data.success) {
        showNotification('success', 'Hasło zostało zmienione pomyślnie')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showNotification('error', response.data.message || 'Wystąpił błąd podczas zmiany hasła')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Wystąpił błąd podczas zmiany hasła'
      showNotification('error', errorMessage)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleGenerateTwoFactor = async () => {
    setTwoFactorLoading(true)
    try {
      const response = await apiClient.post('/user/two-factor/generate')
      if (response.data.success) {
        setTwoFactorSecret(response.data.secret)
        setTwoFactorQrCode(response.data.qrCodeBase64)
        setShowTwoFactorSetup(true)
        setTwoFactorCode('')
      } else {
        showNotification('error', 'Nie udało się wygenerować klucza 2FA')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Wystąpił błąd podczas generowania klucza 2FA'
      showNotification('error', errorMessage)
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const handleEnableTwoFactor = async (e) => {
    e.preventDefault()
    
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      showNotification('error', 'Wprowadź 6-cyfrowy kod z aplikacji autoryzacyjnej')
      return
    }

    setTwoFactorLoading(true)
    try {
      const response = await apiClient.post('/user/two-factor/enable', {
        secret: twoFactorSecret,
        code: twoFactorCode
      })

      if (response.data.success) {
        showNotification('success', '2FA zostało włączone pomyślnie')
        setTwoFactorEnabled(true)
        setShowTwoFactorSetup(false)
        setTwoFactorSecret('')
        setTwoFactorQrCode('')
        setTwoFactorCode('')
      } else {
        showNotification('error', response.data.message || 'Nie udało się włączyć 2FA')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Wystąpił błąd podczas włączania 2FA'
      showNotification('error', errorMessage)
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const handleDisableTwoFactor = async (e) => {
    e.preventDefault()
    
    if (!twoFactorDisablePassword) {
      showNotification('error', 'Wprowadź hasło, aby wyłączyć 2FA')
      return
    }

    setTwoFactorLoading(true)
    try {
      const response = await apiClient.post('/user/two-factor/disable', {
        password: twoFactorDisablePassword
      })

      if (response.data.success) {
        showNotification('success', '2FA zostało wyłączone pomyślnie')
        setTwoFactorEnabled(false)
        setTwoFactorDisablePassword('')
      } else {
        showNotification('error', response.data.message || 'Nie udało się wyłączyć 2FA')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Wystąpił błąd podczas wyłączania 2FA'
      showNotification('error', errorMessage)
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const resetSettings = () => {
    if (window.confirm('Czy na pewno chcesz zresetować wszystkie ustawienia do wartości domyślnych?')) {
      localStorage.removeItem('settings_pageSize')
      localStorage.removeItem('settings_showChecksumButton')
      localStorage.removeItem('settings_defaultView')
      localStorage.removeItem('settings_autoRefresh')
      localStorage.removeItem('settings_autoRefreshInterval')
      localStorage.removeItem('settings_showFileIcons')
      localStorage.removeItem('settings_compactMode')
      localStorage.removeItem('settings_dateFormat')
      localStorage.removeItem('settings_sizeFormat')
      localStorage.removeItem('settings_sortBy')
      localStorage.removeItem('settings_sortOrder')
      
      setPageSize(50)
      setShowChecksumButton(true)
      setDefaultView('table')
      setAutoRefresh(false)
      setAutoRefreshInterval(30)
      setShowFileIcons(true)
      setCompactMode(false)
      setDateFormat('relative')
      setSizeFormat('auto')
      setSortBy('date')
      setSortOrder('desc')
      
      showNotification('success', 'Ustawienia zostały zresetowane')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Ustawienia</h1>
            {user && (
              <p className="text-blue-200 mt-2">
                Użytkownik: <span className="font-semibold">{user.username}</span>
                {user.role === 'Admin' && <span className="ml-2 px-2 py-1 bg-purple-500 rounded text-sm">Admin</span>}
              </p>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => navigate('/files')}
              className="px-4 py-3 sm:py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              ← Powrót do plików
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-3 sm:py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              Wyloguj
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white/10 backdrop-blur-md rounded-xl p-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] touch-manipulation ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              ⚙️ Ogólne
            </button>
            <button
              onClick={() => setActiveTab('display')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] touch-manipulation ${
                activeTab === 'display'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🎨 Wyświetlanie
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] touch-manipulation ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🔒 Bezpieczeństwo
            </button>
            {user?.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] touch-manipulation ${
                  activeTab === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                👑 Panel Admina
              </button>
            )}
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-red-500' :
            'bg-yellow-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-2xl p-6">
          {/* Ogólne */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ustawienia ogólne</h2>
              
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ilość plików na stronie
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="w-full sm:w-auto px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                  >
                    <option value={10}>10 na stronę</option>
                    <option value={25}>25 na stronę</option>
                    <option value={50}>50 na stronę</option>
                    <option value={100}>100 na stronę</option>
                    <option value={200}>200 na stronę</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-2">Wybierz ile plików ma być wyświetlanych na jednej stronie</p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showChecksumButton}
                      onChange={(e) => setShowChecksumButton(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-gray-700">Pokaż przycisk checksumu SHA256</span>
                      <span className="text-sm text-gray-500">Wyświetlaj przycisk do sprawdzania checksumu przy plikach</span>
                    </div>
                  </label>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Domyślny widok
                  </label>
                  <select
                    value={defaultView}
                    onChange={(e) => setDefaultView(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                  >
                    <option value="table">Tabela</option>
                    <option value="cards">Karty</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-2">Wybierz domyślny widok listy plików</p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-gray-700">Automatyczne odświeżanie</span>
                      <span className="text-sm text-gray-500">Automatycznie odświeżaj listę plików w określonych odstępach czasu</span>
                    </div>
                  </label>
                  {autoRefresh && (
                    <div className="mt-3 ml-8">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Interwał odświeżania (sekundy)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={autoRefreshInterval}
                        onChange={(e) => setAutoRefreshInterval(Math.max(5, Math.min(300, Number(e.target.value))))}
                        className="w-full sm:w-auto px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                      />
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFileIcons}
                      onChange={(e) => setShowFileIcons(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-gray-700">Pokaż ikony plików</span>
                      <span className="text-sm text-gray-500">Wyświetlaj emoji ikony przy plikach i folderach</span>
                    </div>
                  </label>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={(e) => setCompactMode(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-gray-700">Tryb kompaktowy</span>
                      <span className="text-sm text-gray-500">Zmniejsz odstępy i rozmiary elementów dla większej ilości informacji na ekranie</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Wyświetlanie */}
          {activeTab === 'display' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ustawienia wyświetlania</h2>
              
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Format daty
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                  >
                    <option value="relative">Względna (np. "2 godziny temu")</option>
                    <option value="short">Krótka (np. "23.12.2024")</option>
                    <option value="long">Długa (np. "23 grudnia 2024, 14:30")</option>
                    <option value="iso">ISO (np. "2024-12-23T14:30:00")</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-2">Wybierz format wyświetlania dat</p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Format rozmiaru
                  </label>
                  <select
                    value={sizeFormat}
                    onChange={(e) => setSizeFormat(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                  >
                    <option value="auto">Automatyczny (KB, MB, GB)</option>
                    <option value="bytes">Zawsze w bajtach</option>
                    <option value="kb">Zawsze w KB</option>
                    <option value="mb">Zawsze w MB</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-2">Wybierz format wyświetlania rozmiaru plików</p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sortowanie domyślne
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                    >
                      <option value="name">Nazwa</option>
                      <option value="date">Data utworzenia</option>
                      <option value="size">Rozmiar</option>
                      <option value="type">Typ</option>
                    </select>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                    >
                      <option value="asc">Rosnąco</option>
                      <option value="desc">Malejąco</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Wybierz domyślne sortowanie listy plików</p>
                </div>
              </div>
            </div>
          )}

          {/* Bezpieczeństwo */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Bezpieczeństwo</h2>
              
              <div className="space-y-8">
                {/* Zmiana hasła */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Zmiana hasła</h3>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Informacja:</strong> Zmiana hasła wymaga podania obecnego hasła w celu weryfikacji.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Obecne hasło
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nowe hasło
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                        required
                        minLength={6}
                      />
                      <p className="text-sm text-gray-500 mt-1">Minimum 6 znaków</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Potwierdź nowe hasło
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                        required
                        minLength={6}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-lg text-base min-h-[44px] touch-manipulation"
                    >
                      {changingPassword ? 'Zmienianie hasła...' : 'Zmień hasło'}
                    </button>
                  </form>
                </div>

                {/* 2FA */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Uwierzytelnianie dwuskładnikowe (2FA)</h3>
                  
                  {twoFactorEnabled ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border-l-4 border-green-400 p-4">
                        <p className="text-sm text-green-800">
                          <strong>✓ 2FA jest włączone</strong> - Twoje konto jest chronione dodatkowym poziomem bezpieczeństwa.
                        </p>
                      </div>

                      <form onSubmit={handleDisableTwoFactor} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Hasło (wymagane do wyłączenia 2FA)
                          </label>
                          <input
                            type="password"
                            value={twoFactorDisablePassword}
                            onChange={(e) => setTwoFactorDisablePassword(e.target.value)}
                            className="w-full px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={twoFactorLoading}
                          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-lg text-base min-h-[44px] touch-manipulation"
                        >
                          {twoFactorLoading ? 'Wyłączanie...' : 'Wyłącz 2FA'}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>⚠️ 2FA jest wyłączone</strong> - Włącz uwierzytelnianie dwuskładnikowe, aby zwiększyć bezpieczeństwo swojego konta.
                        </p>
                      </div>

                      {!showTwoFactorSetup ? (
                        <button
                          onClick={handleGenerateTwoFactor}
                          disabled={twoFactorLoading}
                          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-lg text-base min-h-[44px] touch-manipulation"
                        >
                          {twoFactorLoading ? 'Generowanie...' : 'Włącz 2FA'}
                        </button>
                      ) : (
                        <form onSubmit={handleEnableTwoFactor} className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800 mb-4">
                              <strong>Krok 1:</strong> Zeskanuj kod QR za pomocą aplikacji autoryzacyjnej (np. Google Authenticator, Microsoft Authenticator):
                            </p>
                            {twoFactorQrCode && (
                              <div className="flex justify-center mb-4">
                                <img 
                                  src={`data:image/png;base64,${twoFactorQrCode}`} 
                                  alt="QR Code 2FA" 
                                  className="border-2 border-gray-300 rounded-lg p-2 bg-white"
                                />
                              </div>
                            )}
                            {twoFactorSecret && (
                              <div className="mt-4">
                                <p className="text-sm text-blue-800 mb-2">
                                  <strong>Lub wprowadź ręcznie klucz:</strong>
                                </p>
                                <div className="bg-white p-3 rounded border border-blue-300">
                                  <code className="text-sm font-mono break-all">{twoFactorSecret}</code>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Krok 2: Wprowadź 6-cyfrowy kod z aplikacji autoryzacyjnej
                            </label>
                            <input
                              type="text"
                              value={twoFactorCode}
                              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="w-full px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px] text-center text-2xl tracking-widest"
                              placeholder="000000"
                              maxLength={6}
                              required
                            />
                            <p className="text-sm text-gray-500 mt-2">Wprowadź kod z aplikacji autoryzacyjnej, aby potwierdzić konfigurację</p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              type="submit"
                              disabled={twoFactorLoading || twoFactorCode.length !== 6}
                              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-lg text-base min-h-[44px] touch-manipulation"
                            >
                              {twoFactorLoading ? 'Włączanie...' : 'Potwierdź i włącz 2FA'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowTwoFactorSetup(false)
                                setTwoFactorSecret('')
                                setTwoFactorQrCode('')
                                setTwoFactorCode('')
                              }}
                              className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all transform active:scale-95 shadow-lg text-base min-h-[44px] touch-manipulation"
                            >
                              Anuluj
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>


                {/* Mapowanie dysku sieciowego */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Mapowanie dysku sieciowego</h3>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>ℹ️ Informacja:</strong> Pobierz plik .bat, który automatycznie zmapuje Twój folder na dysk sieciowy w systemie Windows.
                    </p>
                    <p className="text-sm text-blue-800">
                      Po uruchomieniu pliku, Twój folder będzie dostępny jako dysk sieciowy (domyślnie Z:).
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Instrukcja:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                        <li>Kliknij przycisk poniżej, aby pobrać plik <code className="bg-gray-100 px-1 rounded">mapuj_dysk_{user?.username || 'uzytkownika'}.bat</code></li>
                        <li>Zapisz plik w wygodnym miejscu (np. Pulpit)</li>
                        <li>Kliknij dwukrotnie na plik, aby go uruchomić</li>
                        <li>Plik automatycznie zmapuje Twój folder na dysk sieciowy</li>
                        <li>Po zakończeniu, folder zostanie otwarty w Eksploratorze Windows</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Uwagi:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        <li>Dysk będzie zmapowany jako <strong>Z:</strong> (możesz zmienić w pliku .bat)</li>
                        <li>Mapowanie będzie trwałe - dysk pozostanie zmapowany po restarcie komputera</li>
                        <li>Jeśli dysk Z: jest już zajęty, zmień literę dysku w pliku .bat</li>
                        <li>Wymagane są uprawnienia administratora do mapowania dysków sieciowych</li>
                      </ul>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          const response = await apiClient.get('/user/map-drive-script', {
                            responseType: 'blob'
                          })
                          
                          // Utwórz link do pobrania
                          const url = window.URL.createObjectURL(new Blob([response.data]))
                          const link = document.createElement('a')
                          link.href = url
                          link.setAttribute('download', `mapuj_dysk_${user?.username || 'uzytkownika'}.bat`)
                          document.body.appendChild(link)
                          link.click()
                          link.remove()
                          window.URL.revokeObjectURL(url)
                          
                          showNotification('success', 'Plik został pobrany pomyślnie!')
                        } catch (err) {
                          const errorMessage = err.response?.data?.message || 'Wystąpił błąd podczas pobierania pliku'
                          showNotification('error', errorMessage)
                        }
                      }}
                      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all transform active:scale-95 shadow-lg text-base min-h-[44px] touch-manipulation flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Pobierz plik do mapowania dysku
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Panel Admina */}
          {activeTab === 'admin' && user?.role === 'Admin' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Panel Administratora</h2>

              {adminError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {adminError}
                </div>
              )}

              {adminSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                  {adminSuccess}
                </div>
              )}

              {adminLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Ładowanie...</div>
                </div>
              ) : (
                <>
                  {/* Użytkownicy oczekujący na zatwierdzenie */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Użytkownicy oczekujący na zatwierdzenie</h3>
                    {pendingUsers.length === 0 ? (
                      <p className="text-gray-600">Brak użytkowników oczekujących na zatwierdzenie</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
                              <th className="px-6 py-3 text-left">ID</th>
                              <th className="px-6 py-3 text-left">Nazwa użytkownika</th>
                              <th className="px-6 py-3 text-left">Email</th>
                              <th className="px-6 py-3 text-left">Data rejestracji</th>
                              <th className="px-6 py-3 text-left">Akcje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingUsers.map((user) => (
                              <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4">{user.id}</td>
                                <td className="px-6 py-4 font-semibold">{user.username}</td>
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4">{new Date(user.createdAt).toLocaleString('pl-PL')}</td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => handleApprove(user.id)}
                                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                                  >
                                    Zatwierdź
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Wszyscy użytkownicy */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Wszyscy użytkownicy</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
                            <th className="px-6 py-3 text-left">ID</th>
                            <th className="px-6 py-3 text-left">Nazwa użytkownika</th>
                            <th className="px-6 py-3 text-left">Email</th>
                            <th className="px-6 py-3 text-left">Rola</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-left">Quota</th>
                            <th className="px-6 py-3 text-left">Folder SMB</th>
                            <th className="px-6 py-3 text-left">Data zatwierdzenia</th>
                            <th className="px-6 py-3 text-left">Akcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allUsers.map((user) => {
                            const quota = userQuotas[user.id]
                            return (
                              <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4">{user.id}</td>
                                <td className="px-6 py-4 font-semibold">{user.username}</td>
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded ${user.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {user.isApproved ? 'Zatwierdzone' : 'Oczekuje'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {editingQuota === user.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={quotaValue}
                                        onChange={(e) => setQuotaValue(e.target.value)}
                                        placeholder="np. 10GB, 0 = brak limitu"
                                        className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSetQuota(user.id)
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() => handleSetQuota(user.id)}
                                        className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingQuota(null)
                                          setQuotaValue('')
                                        }}
                                        className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      {quota ? (
                                        <div>
                                          <div className="font-semibold">
                                            {quota.quota ? formatFileSize(quota.quota) : 'Brak limitu'}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Użyto: {formatFileSize(quota.used)} ({quota.percentUsed.toFixed(1)}%)
                                          </div>
                                          {quota.quota && (
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                              <div
                                                className={`h-2 rounded-full ${
                                                  quota.percentUsed > 90 ? 'bg-red-500' :
                                                  quota.percentUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(quota.percentUsed, 100)}%` }}
                                              ></div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-mono text-sm">{user.smbFolderPath || '-'}</td>
                                <td className="px-6 py-4">{user.approvedAt ? new Date(user.approvedAt).toLocaleString('pl-PL') : '-'}</td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => {
                                      setEditingQuota(user.id)
                                      setQuotaValue(quota?.quota ? formatFileSize(quota.quota) : '')
                                    }}
                                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                                  >
                                    {editingQuota === user.id ? 'Anuluj' : 'Edytuj quota'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Reset Settings Button */}
        {activeTab !== 'admin' && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={resetSettings}
              className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all transform active:scale-95 text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              🔄 Resetuj ustawienia
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings

