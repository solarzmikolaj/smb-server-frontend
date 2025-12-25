import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/axiosConfig'

const Dashboard = ({ onLogout, user }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [largestFiles, setLargestFiles] = useState([])
  const [activityHistory, setActivityHistory] = useState([])
  const [systemStats, setSystemStats] = useState(null)
  const [recalculating, setRecalculating] = useState(false)
  const [loadingSystemStats, setLoadingSystemStats] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Pobierz dane bez statystyk (które wymagają przeliczania folderów)
      // Pobierz największe pliki i historię aktywności
      const [largestRes, activityRes] = await Promise.all([
        apiClient.get('/dashboard/largest-files?limit=10'),
        apiClient.get('/dashboard/activity-history?page=1&pageSize=20')
      ])

      setLargestFiles(largestRes.data)
      setActivityHistory(activityRes.data.items || [])

      // Jeśli użytkownik jest adminem, pobierz statystyki systemu (bez totalStorage)
      // if (user?.role === 'Admin') {
      //   try {
      //     const systemRes = await apiClient.get('/dashboard/system-stats')
      //     // Ustawiamy statystyki, ale totalStorage zostanie null (będzie przeliczone na żądanie)
      //     setSystemStats({
      //       ...systemRes.data,
      //       totalStorage: null // Nie pobieramy automatycznie, bo to trwa
      //     })
      //   } catch (err) {
      //     console.error('Error fetching system stats:', err)
      //   }
      // }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const recalculateStats = async () => {
    setRecalculating(true)
    try {
      const statsRes = await apiClient.get('/dashboard/stats')
      setStats(statsRes.data)
    } catch (err) {
      console.error('Error recalculating stats:', err)
    } finally {
      setRecalculating(false)
    }
  }

  const recalculateSystemStorage = async () => {
    setRecalculating(true)
    try {
      const systemRes = await apiClient.get('/dashboard/system-stats')
      setSystemStats(prev => ({
        ...prev,
        totalStorage: systemRes.data.totalStorage
      }))
    } catch (err) {
      console.error('Error recalculating system storage:', err)
    } finally {
      setRecalculating(false)
    }
  }

  const fetchSystemStats = async () => {
    setLoadingSystemStats(true)
    try {
      const systemRes = await apiClient.get('/dashboard/system-stats')
      setSystemStats(systemRes.data)
    } catch (err) {
      console.error('Error fetching system stats:', err)
    } finally {
      setLoadingSystemStats(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const sizeIndex = Math.max(0, Math.min(i, sizes.length - 1))
    const value = bytes / Math.pow(k, sizeIndex)
    return Math.round(value * 100) / 100 + ' ' + sizes[sizeIndex]
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeDate = (date) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'przed chwilą'
    if (diffMins < 60) return `${diffMins} min temu`
    if (diffHours < 24) return `${diffHours} godz. temu`
    if (diffDays < 7) return `${diffDays} dni temu`
    return formatDate(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Ładowanie dashboardu...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Dashboard</h1>
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
              📁 Pliki
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-3 sm:py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              ⚙️ Ustawienia
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
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] touch-manipulation ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📊 Przegląd
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] touch-manipulation ${
                activeTab === 'activity'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📝 Aktywność
            </button>
            {user?.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all min-h-[44px] touch-manipulation ${
                  activeTab === 'system'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                🖥️ System
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-2xl p-6">
          {/* Przegląd */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Przegląd</h2>

              {/* Statystyki główne */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Statystyki</h3>
                <button
                  onClick={recalculateStats}
                  disabled={recalculating}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all transform active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {recalculating ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Przeliczanie...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>Przelicz</span>
                    </>
                  )}
                </button>
              </div>
              {stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="text-sm text-gray-600 mb-1">Całkowity rozmiar</div>
                    <div className="text-2xl font-bold text-blue-700">{formatFileSize(stats.totalSize)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                    <div className="text-sm text-gray-600 mb-1">Liczba plików</div>
                    <div className="text-2xl font-bold text-green-700">{stats.fileCount}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-600 mb-1">Liczba folderów</div>
                    <div className="text-2xl font-bold text-yellow-700">{stats.folderCount}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center mb-6">
                  <p className="text-gray-500 mb-4">Kliknij "Przelicz", aby wyświetlić statystyki</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                      <div className="text-sm text-gray-400 mb-1">Całkowity rozmiar</div>
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                      <div className="text-sm text-gray-400 mb-1">Liczba plików</div>
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                      <div className="text-sm text-gray-400 mb-1">Liczba folderów</div>
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Największe pliki */}
              {largestFiles && largestFiles.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 10 największych plików</h3>
                  <div className="space-y-2">
                    {largestFiles.slice(0, 10).map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{file.name}</div>
                            <div className="text-sm text-gray-500 truncate">{file.path}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatFileSize(file.size)}</div>
                          <div className="text-xs text-gray-500">{formatDate(file.lastModified)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aktywność */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Historia aktywności</h2>
              {activityHistory && activityHistory.length > 0 ? (
                <div className="space-y-2">
                  {activityHistory.map((activity) => (
                    <div key={activity.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{activity.action}</div>
                          {activity.resource && (
                            <div className="text-sm text-gray-600 mt-1">Zasób: {activity.resource}</div>
                          )}
                          {activity.details && (
                            <div className="text-sm text-gray-500 mt-1">{activity.details}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm text-gray-500">{formatRelativeDate(activity.timestamp)}</div>
                          <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                            activity.severity === 'Error' ? 'bg-red-100 text-red-800' :
                            activity.severity === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {activity.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500">Brak historii aktywności</p>
                </div>
              )}
            </div>
          )}

          {/* System (tylko admin) */}
          {activeTab === 'system' && user?.role === 'Admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Statystyki systemu</h2>
                <button
                  onClick={fetchSystemStats}
                  disabled={loadingSystemStats}
                  className="px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all transform active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingSystemStats ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Ładowanie...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>Odśwież</span>
                    </>
                  )}
                </button>
              </div>
              {systemStats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="text-sm text-gray-600 mb-1">Wszyscy użytkownicy</div>
                    <div className="text-2xl font-bold text-blue-700">{systemStats.totalUsers}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                    <div className="text-sm text-gray-600 mb-1">Aktywni (30 dni)</div>
                    <div className="text-2xl font-bold text-green-700">{systemStats.activeUsers}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-600 mb-1">Oczekujący</div>
                    <div className="text-2xl font-bold text-yellow-700">{systemStats.pendingUsers}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-gray-600">Całkowite użycie</div>
                      <button
                        onClick={recalculateSystemStorage}
                        disabled={recalculating}
                        className="px-2 py-1 text-xs bg-purple-500 text-white font-semibold rounded hover:bg-purple-600 transition-all transform active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Przelicz całkowite użycie"
                      >
                        {recalculating ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <span>🔄</span>
                        )}
                      </button>
                    </div>
                    {systemStats.totalStorage !== null && systemStats.totalStorage !== undefined ? (
                      <div className="text-2xl font-bold text-purple-700">{formatFileSize(systemStats.totalStorage)}</div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-400">—</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500 mb-4">Kliknij "Odśwież", aby wyświetlić statystyki systemu</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                      <div className="text-sm text-gray-400 mb-1">Wszyscy użytkownicy</div>
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                      <div className="text-sm text-gray-400 mb-1">Aktywni (30 dni)</div>
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                      <div className="text-sm text-gray-400 mb-1">Oczekujący</div>
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-l-4 border-gray-300">
                      <div className="text-sm text-gray-400 mb-1">Całkowite użycie</div>
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard



