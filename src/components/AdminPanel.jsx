import { useState, useEffect } from 'react'
import apiClient from '../api/axiosConfig'
import { useNavigate } from 'react-router-dom'

const AdminPanel = ({ onLogout }) => {
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingQuota, setEditingQuota] = useState(null)
  const [quotaValue, setQuotaValue] = useState('')
  const [userQuotas, setUserQuotas] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    fetchPendingUsers()
    fetchAllUsers()
  }, [])

  const fetchPendingUsers = async () => {
    try {
      const response = await apiClient.get('/user/pending')
      setPendingUsers(response.data || [])
    } catch (err) {
      console.error('Error fetching pending users:', err)
      setError('Nie udało się pobrać listy użytkowników oczekujących')
    } finally {
      setLoading(false)
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
          try {
            // Oblicz użycie (uproszczone - można poprawić)
            // W rzeczywistości powinno być wywołanie API, ale na razie użyjemy tylko quota z UserDto
            quotas[user.id] = {
              quota: user.storageQuota,
              used: 0, // TODO: obliczyć rzeczywiste użycie
              remaining: user.storageQuota,
              percentUsed: 0
            }
          } catch (err) {
            // Ignoruj błędy
          }
        }
      }
      setUserQuotas(quotas)
    } catch (err) {
      console.error('Error fetching all users:', err)
    }
  }

  const handleSetQuota = async (userId) => {
    setError('')
    setSuccess('')
    try {
      const quotaBytes = quotaValue.trim() === '' ? 0 : parseQuotaInput(quotaValue)
      await apiClient.post(`/user/quota/${userId}`, {
        quotaBytes: quotaBytes
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      setSuccess(`Quota została ustawiona dla użytkownika`)
      setEditingQuota(null)
      setQuotaValue('')
      await fetchAllUsers()
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas ustawiania quota'
      setError(errorMessage)
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

  const handleApprove = async (userId) => {
    setError('')
    setSuccess('')
    try {
      const response = await apiClient.post(`/user/approve/${userId}`)
      setSuccess('Konto zostało zatwierdzone i folder SMB został utworzony')
      fetchPendingUsers()
      fetchAllUsers()
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas zatwierdzania konta'
      setError(errorMessage)
    }
  }

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-white text-xl text-center mt-20">Ładowanie...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Panel Administratora</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/files')}
              className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all"
            >
              Przejdź do plików
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all"
            >
              Wyloguj się
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Użytkownicy oczekujący na zatwierdzenie */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Użytkownicy oczekujący na zatwierdzenie</h2>
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
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wszyscy użytkownicy</h2>
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
      </div>
    </div>
  )
}

export default AdminPanel

