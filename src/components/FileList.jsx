import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/axiosConfig'
import { renderAsync } from 'docx-preview'

// Komponent odtwarzacza wideo
const VideoPlayer = ({ src, fileName, onError }) => {
  return (
    <video
      controls
      autoPlay={false}
      preload="metadata"
      className="max-w-full max-h-full w-auto h-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
      onError={(e) => {
        console.error('Video error:', e)
        onError()
      }}
    >
      <source src={src} type="video/mp4" />
      <source src={src} type="video/quicktime" />
      <source src={src} type="video/x-msvideo" />
      <source src={src} type="video/x-matroska" />
      <source src={src} type="video/webm" />
      Twoja przeglądarka nie obsługuje odtwarzacza wideo.
      <a href={src} download={fileName} className="text-blue-400 hover:underline ml-2">
        Pobierz plik
      </a>
    </video>
  )
}

const FileList = ({ onLogout, user }) => {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('settings_pageSize')
    return saved ? parseInt(saved) : 50
  })
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showChecksumButton, setShowChecksumButton] = useState(() => {
    const saved = localStorage.getItem('settings_showChecksumButton')
    return saved !== null ? saved === 'true' : true
  })
  const [defaultView, setDefaultView] = useState(() => {
    const saved = localStorage.getItem('settings_defaultView')
    return saved || 'cards'
  })
  const [currentPath, setCurrentPath] = useState('')
  
  // Ustaw początkową ścieżkę na folder użytkownika
  useEffect(() => {
    if (user && user.smbFolderPath) {
      setCurrentPath(user.smbFolderPath)
    }
  }, [user])
  const [filter, setFilter] = useState('')
  const [filterType, setFilterType] = useState('all') // all, folder, file
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [filterExtension, setFilterExtension] = useState('')
  const [filterSizeMin, setFilterSizeMin] = useState('')
  const [filterSizeMax, setFilterSizeMax] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [searchMode, setSearchMode] = useState('local') // 'local' lub 'global'
  const [globalSearchResults, setGlobalSearchResults] = useState([])
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState('')
  const [uploadedBytes, setUploadedBytes] = useState(0)
  const [uploadStartTime, setUploadStartTime] = useState(null)
  const [uploadAbortController, setUploadAbortController] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false)
  const [itemsToDelete, setItemsToDelete] = useState([])
  const [notification, setNotification] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set()) // Zaznaczone elementy (indeksy)
  const [showChecksumModal, setShowChecksumModal] = useState(false)
  const [checksumData, setChecksumData] = useState(null)
  const [checksumLoading, setChecksumLoading] = useState(false)
  const [showTrashModal, setShowTrashModal] = useState(false)
  const [trashItems, setTrashItems] = useState([])
  const [trashLoading, setTrashLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState('')
  const [deletePercent, setDeletePercent] = useState(0)
  const [deletingItem, setDeletingItem] = useState(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveDestinationPath, setMoveDestinationPath] = useState('')
  const [moving, setMoving] = useState(false)
  const [moveProgress, setMoveProgress] = useState('')
  const [movePercent, setMovePercent] = useState(0)
  const [moveSpeed, setMoveSpeed] = useState('')
  const [movedBytes, setMovedBytes] = useState(0)
  const [moveTotalSize, setMoveTotalSize] = useState(0)
  const [moveStartTime, setMoveStartTime] = useState(null)
  const [moveOverwrite, setMoveOverwrite] = useState(false)
  const [moveBrowsePath, setMoveBrowsePath] = useState('')
  const [moveFolders, setMoveFolders] = useState([])
  const [moveFoldersLoading, setMoveFoldersLoading] = useState(false)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const docxPreviewRef = useRef(null)

  useEffect(() => {
    if (searchMode === 'local') {
      fetchFiles(currentPage, pageSize, currentPath)
      // Wyczyść zaznaczenia przy zmianie strony lub ścieżki
      setSelectedItems(new Set())
    }
  }, [currentPage, pageSize, currentPath, searchMode])

  // Wyszukiwanie globalne - uruchamia się gdy zmienią się filtry
  useEffect(() => {
    if (searchMode === 'global') {
      const hasFilters = filter || filterExtension || filterSizeMin || filterSizeMax || filterDateFrom || filterDateTo
      if (hasFilters) {
        const timeoutId = setTimeout(() => {
          performGlobalSearch()
        }, 500) // Debounce 500ms
        
        return () => clearTimeout(timeoutId)
      } else {
        setGlobalSearchResults([])
        setTotalCount(0)
        setTotalPages(1)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, filterExtension, filterSizeMin, filterSizeMax, filterDateFrom, filterDateTo, searchMode, currentPage, pageSize])

  // Renderuj dokument docx używając docx-preview
  useEffect(() => {
    if (previewItem && previewItem.type === 'docx' && previewItem.arrayBuffer && docxPreviewRef.current) {
      // Wyczyść poprzednią zawartość
      docxPreviewRef.current.innerHTML = ''
      
      // Renderuj dokument
      renderAsync(previewItem.arrayBuffer, docxPreviewRef.current, null, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: true, // Ignoruj szerokość - pozwól na responsywne skalowanie
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        useMathMLPolyfill: true,
        showChanges: false,
        showInserted: true,
        showDeleted: false
      }).catch(err => {
        console.error('Błąd renderowania docx:', err)
        if (docxPreviewRef.current) {
          docxPreviewRef.current.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
              <p class="text-gray-600 mb-4">Nie można wyświetlić dokumentu Word.</p>
              <a href="${previewItem.url}" download="${previewItem.name}" class="text-blue-700 hover:underline font-medium px-4 py-2 bg-blue-50 rounded-lg">
                Pobierz plik Word
              </a>
            </div>
          `
        }
      })
    }
    
    // Cleanup: wyczyść zawartość przy zamknięciu
    return () => {
      if (docxPreviewRef.current) {
        docxPreviewRef.current.innerHTML = ''
      }
    }
  }, [previewItem])

  const fetchFiles = async (page = 1, size = 50, path = '') => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/file', {
        params: {
          page: page,
          pageSize: size,
          path: path || undefined
        }
      })
      
      if (response.data && response.data.items) {
        setItems(response.data.items)
        setTotalPages(response.data.totalPages || 1)
        setTotalCount(response.data.totalCount || 0)
      } else {
        const filesData = Array.isArray(response.data) ? response.data : []
        setItems(filesData)
        setTotalPages(1)
        setTotalCount(filesData.length)
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || err.message || 'Wystąpił błąd podczas pobierania listy plików'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes) return '-'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('pl-PL')
  }

  const handleFolderClick = (folderName, fullPath = null) => {
    // Jeśli jest pełna ścieżka (z wyszukiwania globalnego), użyj jej
    if (fullPath && user?.smbFolderPath) {
      // Upewnij się, że ścieżka zaczyna się od folderu użytkownika
      const normalizedFullPath = fullPath.replace(/\\/g, '/')
      const normalizedUserPath = user.smbFolderPath.replace(/\\/g, '/')
      
      if (normalizedFullPath.startsWith(normalizedUserPath)) {
        setCurrentPath(normalizedFullPath)
        setCurrentPage(1)
        setSearchMode('local') // Przełącz na tryb lokalny po kliknięciu w folder
        return
      }
    }
    
    // Standardowa obsługa dla trybu lokalnego
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName
    setCurrentPath(newPath)
    setCurrentPage(1)
  }

  const handleBreadcrumbClick = (index) => {
    if (!user?.smbFolderPath) return
    
    // Pobierz tylko części ścieżki od folderu użytkownika
    const userPathParts = user.smbFolderPath.split('/').filter(Boolean)
    const currentPathParts = currentPath.split('/').filter(Boolean)
    const relativeParts = currentPathParts.slice(userPathParts.length)
    
    // Zbuduj nową ścieżkę od folderu użytkownika
    const newRelativeParts = relativeParts.slice(0, index + 1)
    const newPath = userPathParts.concat(newRelativeParts).join('/')
    setCurrentPath(newPath)
    setCurrentPage(1)
  }

  const handlePreview = async (fileName, itemType, itemPath = null) => {
    if (itemType === 'folder') {
      handleFolderClick(fileName, itemPath)
      return
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const pdfExtensions = ['.pdf']
    const docxExtensions = ['.docx']
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp', '.ogv']
    const textExtensions = ['.txt', '.text', '.log', '.md', '.json', '.xml', '.csv', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.htm', '.php', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.sql', '.sh', '.bat', '.ps1', '.yaml', '.yml', '.ini', '.conf', '.config']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    
    if (imageExtensions.includes(extension) || pdfExtensions.includes(extension) || docxExtensions.includes(extension) || textExtensions.includes(extension) || videoExtensions.includes(extension)) {
      try {
        // Użyj pełnej ścieżki jeśli jest dostępna (z wyszukiwania globalnego), w przeciwnym razie zbuduj z currentPath
        let filePath
        if (itemPath && searchMode === 'global') {
          filePath = itemPath
        } else {
          filePath = currentPath ? `${currentPath}/${fileName}` : fileName
        }
        
        // Dla plików wideo używamy bezpośredniego streamingu bez pobierania całego pliku
        if (videoExtensions.includes(extension)) {
          // Utwórz bezpośredni URL do API z tokenem w query string
          // (element <video> nie obsługuje nagłówków Authorization)
          const token = localStorage.getItem('token')
          const baseURL = apiClient.defaults.baseURL || ''
          // Używamy base64 zamiast encodeURIComponent, aby uniknąć problemów z ukośnikami
          const encodedPath = btoa(unescape(encodeURIComponent(filePath)))
          const directUrl = `${baseURL}/file/preview?filePath=${encodedPath}${token ? `&token=${encodeURIComponent(token)}` : ''}`
          
          // Pobierz tylko rozmiar pliku używając HEAD request (bez pobierania całego pliku)
          let fileSize = 0
          const maxVideoSize = 25 * 1024 * 1024 // 25MB w bajtach
          
          // Spróbuj pobrać rozmiar asynchronicznie (nie blokujemy otwierania preview)
          // Używamy fetch z HEAD request
          fetch(directUrl, { method: 'HEAD' })
            .then(response => {
              const contentLength = response.headers.get('content-length')
              if (contentLength) {
                fileSize = parseInt(contentLength)
                // Zaktualizuj typ jeśli rozmiar przekracza limit
                if (fileSize > maxVideoSize) {
                  setPreviewItem(prev => prev ? { ...prev, type: 'video-large', size: fileSize } : null)
                } else {
                  setPreviewItem(prev => prev ? { ...prev, size: fileSize } : null)
                }
              }
            })
            .catch(err => {
              console.error('Błąd podczas pobierania rozmiaru pliku wideo:', err)
              // Kontynuuj bez rozmiaru - wideo i tak będzie działać
            })
          
          // Ustaw preview item natychmiast - nie czekamy na pobranie rozmiaru
          // Wideo będzie strumieniowane od razu
          setPreviewItem({
            name: fileName,
            url: directUrl,
            type: 'video', // Domyślnie 'video', może zostać zmienione na 'video-large' jeśli rozmiar > 25MB
            size: 0 // Będzie zaktualizowane asynchronicznie
          })
          return
        }
        
        // Dla plików tekstowych pobierz jako tekst
        if (textExtensions.includes(extension)) {
          try {
            const response = await apiClient.get('/file/preview', {
              params: { filePath: filePath },
              responseType: 'blob' // Pobierz jako blob, potem odczytaj jako tekst
            })
            
            // Odczytaj blob jako tekst
            const blob = response.data
            const text = await blob.text()
            
            setPreviewItem({
              name: fileName,
              url: null,
              type: 'text',
              content: text
            })
          } catch (err) {
            const errorMessage = err.response?.data?.message || err.response?.data || 'Nie można otworzyć podglądu'
            showNotification('error', errorMessage)
            console.error('Błąd podczas pobierania pliku tekstowego:', err)
          }
          return
        }
        
        // Pobierz plik jako blob przez API (z tokenem autoryzacji)
        const response = await apiClient.get('/file/preview', {
          params: { filePath: filePath },
          responseType: 'blob'
        })
        
        // response.data jest już Blobem z axios
        const blob = response.data
        
        // Utwórz blob URL z pobranych danych
        const blobUrl = window.URL.createObjectURL(blob)
        
        // Dla plików .docx, użyj docx-preview do renderowania
        if (docxExtensions.includes(extension)) {
          setPreviewItem({
            name: fileName,
            url: blobUrl, // Zachowaj blob URL dla pobierania
            type: 'docx',
            arrayBuffer: await blob.arrayBuffer() // Przechowaj ArrayBuffer dla docx-preview
          })
        } else {
          setPreviewItem({
            name: fileName,
            url: blobUrl,
            type: pdfExtensions.includes(extension) ? 'pdf' : 'image'
          })
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.response?.data || 'Nie można otworzyć podglądu'
        showNotification('error', errorMessage)
      }
    } else {
      handleDownload(fileName, itemType, itemPath)
    }
  }

  const handleDownload = async (fileName, itemType, itemPath = null) => {
    if (itemType === 'folder') return

    try {
      // Użyj pełnej ścieżki jeśli jest dostępna (z wyszukiwania globalnego), w przeciwnym razie zbuduj z currentPath
      let filePath
      if (itemPath && searchMode === 'global') {
        filePath = itemPath
      } else {
        filePath = currentPath ? `${currentPath}/${fileName}` : fileName
      }
      
      // Używamy bezpośredniego linku do download endpointu zamiast pobierania całego pliku do pamięci
      // Przeglądarka pobierze plik przez streaming, co zapobiega problemom z pamięcią dla dużych plików
      const token = localStorage.getItem('token')
      const baseURL = apiClient.defaults.baseURL || ''
      const encodedPath = encodeURIComponent(filePath)
      const downloadUrl = `${baseURL}/file/download?filePath=${encodedPath}${token ? `&token=${encodeURIComponent(token)}` : ''}`
      
      // Utwórz link i kliknij go programatycznie - przeglądarka pobierze plik przez streaming
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Błąd podczas pobierania pliku:', err)
      showNotification('error', 'Wystąpił błąd podczas pobierania pliku')
    }
  }

  const handleChecksum = async (fileName, itemPath = null) => {
    setChecksumLoading(true)
    setChecksumData(null)
    setShowChecksumModal(true)
    
    try {
      // Użyj pełnej ścieżki jeśli jest dostępna (z wyszukiwania globalnego), w przeciwnym razie zbuduj z currentPath
      let fullPath
      if (itemPath && searchMode === 'global') {
        fullPath = itemPath
      } else {
        fullPath = currentPath ? `${currentPath}/${fileName}` : fileName
      }

      const response = await apiClient.get('/file/checksum', {
        params: { filePath: fullPath }
      })
      
      setChecksumData({
        fileName: fileName,
        checksum: response.data.checksum,
        algorithm: response.data.algorithm || 'SHA256'
      })
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas obliczania checksumu'
      setChecksumData({
        fileName: fileName,
        error: errorMessage
      })
    } finally {
      setChecksumLoading(false)
    }
  }

  const handleDelete = (itemName, itemType) => {
    setDeleteItem({ name: itemName, type: itemType })
    setShowDeleteConfirm(true)
  }

  // Funkcje do zarządzania zaznaczonymi elementami
  const toggleItemSelection = (index) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedItems(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map((_, index) => index)))
    }
  }

  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return

    const items = Array.from(selectedItems).map(index => filteredItems[index])
    setItemsToDelete(items)
    setShowDeleteSelectedConfirm(true)
  }

  const handleMoveSelected = async () => {
    if (selectedItems.size === 0) return

    const initialPath = currentPath || user?.smbFolderPath || ''
    setMoveDestinationPath(initialPath)
    setMoveBrowsePath(initialPath)
    setShowMoveModal(true)
    await fetchMoveFolders(initialPath)
  }

  const fetchMoveFolders = async (path) => {
    setMoveFoldersLoading(true)
    try {
      const response = await apiClient.get('/file', {
        params: {
          page: 1,
          pageSize: 1000,
          path: path || undefined
        }
      })
      
      if (response.data && response.data.items) {
        // Filtruj tylko foldery
        const folders = response.data.items.filter(item => 
          (item.type || item.Type) === 'folder'
        )
        setMoveFolders(folders)
      } else {
        setMoveFolders([])
      }
    } catch (err) {
      console.error('Błąd podczas pobierania folderów:', err)
      setMoveFolders([])
    } finally {
      setMoveFoldersLoading(false)
    }
  }

  const handleMoveFolderClick = async (folderName, folderPath) => {
    const newPath = folderPath || (moveBrowsePath ? `${moveBrowsePath}/${folderName}` : folderName)
    setMoveBrowsePath(newPath)
    setMoveDestinationPath(newPath)
    await fetchMoveFolders(newPath)
  }

  const handleMoveFolderUp = async () => {
    if (!moveBrowsePath || moveBrowsePath === (user?.smbFolderPath || '')) return
    
    const parentPath = moveBrowsePath.split('/').slice(0, -1).join('/') || (user?.smbFolderPath || '')
    setMoveBrowsePath(parentPath)
    setMoveDestinationPath(parentPath)
    await fetchMoveFolders(parentPath)
  }

  const handleMoveFiles = async () => {
    if (selectedItems.size === 0 || !moveDestinationPath.trim()) {
      showNotification('error', 'Wybierz folder docelowy')
      return
    }

    const itemsToMove = Array.from(selectedItems).map(index => {
      const item = filteredItems[index]
      const itemPath = item.path || item.Path || (currentPath ? `${currentPath}/${item.name || item.Name}` : (item.name || item.Name))
      return {
        path: itemPath,
        isFolder: (item.type || item.Type) === 'folder'
      }
    })

    setMoving(true)
    setMoveProgress('')
    setMovePercent(0)
    setMoveSpeed('')
    setMovedBytes(0)
    setError('')

    const startTime = Date.now()
    setMoveStartTime(startTime)

    // Oblicz całkowity rozmiar przed przenoszeniem
    let totalSize = 0
    for (const item of itemsToMove) {
      const itemIndex = Array.from(selectedItems).find(idx => {
        const filteredItem = filteredItems[idx]
        const itemPath = filteredItem.path || filteredItem.Path || (currentPath ? `${currentPath}/${filteredItem.name || filteredItem.Name}` : (filteredItem.name || filteredItem.Name))
        return itemPath === item.path
      })
      if (itemIndex !== undefined) {
        const filteredItem = filteredItems[itemIndex]
        if (item.isFolder) {
          // Dla folderów szacujemy rozmiar (można by pobrać z API, ale to skomplikowane)
          totalSize += 0 // Będzie zaktualizowane z odpowiedzi
        } else {
          totalSize += filteredItem.size || filteredItem.Size || 0
        }
      }
    }

    setMoveTotalSize(totalSize)
    setMoveProgress('Rozpoczynanie przenoszenia...')

    try {
      const response = await apiClient.post('/file/move', {
        items: itemsToMove,
        destinationPath: moveDestinationPath.trim(),
        overwrite: moveOverwrite
      })

      // Aktualizuj postęp na podstawie odpowiedzi
      if (response.data) {
        const actualTotalSize = response.data.totalSize || totalSize
        const movedSize = response.data.movedSize || 0
        setMoveTotalSize(actualTotalSize)

        // Oblicz postęp
        if (actualTotalSize > 0) {
          const percent = Math.min(100, Math.round((movedSize / actualTotalSize) * 100))
          setMovePercent(percent)
          setMovedBytes(movedSize)

          // Oblicz prędkość
          const elapsed = (Date.now() - startTime) / 1000
          if (elapsed > 0) {
            const speed = movedSize / elapsed
            setMoveSpeed(formatSpeed(speed))
          }
        } else {
          // Jeśli nie ma rozmiaru, pokaż postęp na podstawie liczby elementów
          const percent = Math.round((response.data.movedCount / response.data.totalItems) * 100)
          setMovePercent(percent)
        }

        setMoveProgress(`Przeniesiono ${response.data.movedCount}/${response.data.totalItems} elementów`)

        // Krótkie opóźnienie, żeby użytkownik zobaczył 100%
        await new Promise(resolve => setTimeout(resolve, 500))

        if (response.data.movedCount > 0) {
          showNotification('success', `Pomyślnie przeniesiono ${response.data.movedCount} elementów`)
        }

        if (response.data.failedCount > 0) {
          showNotification('warning', `${response.data.failedCount} elementów nie udało się przenieść`)
        }

        // Odśwież listę plików
        await fetchFiles(currentPage, pageSize, currentPath)
        setSelectedItems(new Set())
        setShowMoveModal(false)
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas przenoszenia plików'
      setError(errorMessage)
      showNotification('error', errorMessage)
    } finally {
      setMoving(false)
      setMoveProgress('')
      setMovePercent(0)
      setMoveSpeed('')
      setMovedBytes(0)
      setMoveStartTime(null)
    }
  }

  const confirmDeleteSelected = async () => {
    if (itemsToDelete.length === 0) return

    setDeleting(true)
    setDeleteProgress('')
    setDeletePercent(0)
    setShowDeleteSelectedConfirm(false)

    try {
      let successCount = 0
      let failCount = 0
      const totalItems = itemsToDelete.length

      for (let i = 0; i < itemsToDelete.length; i++) {
        const item = itemsToDelete[i]
        try {
          const itemName = item.name || item.Name || ''
          const itemType = item.type || item.Type || 'file'
          const itemPath = item.path || item.Path || null
          
          // Użyj pełnej ścieżki jeśli jest dostępna (z wyszukiwania globalnego), w przeciwnym razie zbuduj z currentPath
          let fullPath
          if (itemPath && searchMode === 'global') {
            fullPath = itemPath
          } else {
            fullPath = currentPath ? `${currentPath}/${itemName}` : itemName
          }

          // Aktualizuj postęp
          const currentPercent = Math.round(((i + 1) / totalItems) * 100)
          setDeletePercent(currentPercent)
          setDeleteProgress(`Usuwanie ${i + 1} z ${totalItems}: ${itemName}`)
          setDeletingItem(itemName)

          await apiClient.delete('/file', {
            params: { 
              path: fullPath,
              isFolder: itemType === 'folder'
            }
          })
          successCount++
        } catch (err) {
          console.error('Błąd podczas usuwania:', err)
          failCount++
        }
      }

      setSelectedItems(new Set())
      setItemsToDelete([])
      setDeleting(false)
      setDeleteProgress('')
      setDeletePercent(0)
      setDeletingItem(null)
      fetchFiles(currentPage, pageSize, currentPath)
      
      if (failCount === 0) {
        showNotification('success', `Pomyślnie usunięto ${successCount} ${successCount === 1 ? 'element' : 'elementów'}`)
      } else {
        showNotification('warning', `Usunięto ${successCount} ${successCount === 1 ? 'element' : 'elementów'}, ${failCount} nie powiodło się`)
      }
    } catch (err) {
      setDeleting(false)
      setDeleteProgress('')
      setDeletePercent(0)
      setDeletingItem(null)
      setItemsToDelete([])
      showNotification('error', 'Wystąpił błąd podczas usuwania elementów')
    }
  }

  const confirmDelete = async () => {
    if (!deleteItem) return

    setDeleting(true)
    setDeleteProgress(`Usuwanie ${deleteItem.name}...`)
    setDeletePercent(0)
    setDeletingItem(deleteItem.name)
    setShowDeleteConfirm(false)

    try {
      const itemPath = currentPath ? `${currentPath}/${deleteItem.name}` : deleteItem.name
      
      // Symuluj postęp (dla dużych plików)
      const progressInterval = setInterval(() => {
        setDeletePercent(prev => {
          if (prev >= 90) return prev
          return prev + 5
        })
      }, 200)

      await apiClient.delete('/file', {
        params: { 
          path: itemPath,
          isFolder: deleteItem.type === 'folder'
        }
      })
      
      clearInterval(progressInterval)
      setDeletePercent(100)
      
      setTimeout(() => {
        setDeleting(false)
        setDeleteProgress('')
        setDeletePercent(0)
        setDeletingItem(null)
        setDeleteItem(null)
        fetchFiles(currentPage, pageSize, currentPath)
        showNotification('success', `${deleteItem.type === 'folder' ? 'Folder' : 'Plik'} został przeniesiony do kosza`)
      }, 300)
    } catch (err) {
      setDeleting(false)
      setDeleteProgress('')
      setDeletePercent(0)
      setDeletingItem(null)
      setDeleteItem(null)
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas usuwania'
      showNotification('error', errorMessage)
    }
  }

  const fetchTrashItems = async () => {
    setTrashLoading(true)
    try {
      const response = await apiClient.get('/file/trash')
      setTrashItems(response.data)
    } catch (err) {
      showNotification('error', 'Wystąpił błąd podczas pobierania kosza')
    } finally {
      setTrashLoading(false)
    }
  }

  const handleRestoreFromTrash = async (id) => {
    try {
      await apiClient.post(`/file/trash/${id}/restore`)
      showNotification('success', 'Element został przywrócony')
      await fetchTrashItems()
      fetchFiles(currentPage, pageSize, currentPath)
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Wystąpił błąd podczas przywracania'
      showNotification('error', errorMessage)
    }
  }

  const handleDeleteFromTrash = async (id) => {
    if (!window.confirm('Czy na pewno chcesz trwale usunąć ten element z kosza?')) {
      return
    }

    try {
      await apiClient.delete(`/file/trash/${id}`)
      showNotification('success', 'Element został trwale usunięty')
      await fetchTrashItems()
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Wystąpił błąd podczas usuwania'
      showNotification('error', errorMessage)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
    return Math.round(bytesPerSecond / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort()
      setUploadAbortController(null)
    }
    setUploading(false)
    setUploadProgress('')
    setUploadPercent(0)
    setUploadSpeed('')
    setUploadedBytes(0)
    setUploadStartTime(null)
    showNotification('warning', 'Przesyłanie zostało anulowane')
  }

  const handleUpload = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Utwórz AbortController dla anulowania
    const abortController = new AbortController()
    setUploadAbortController(abortController)

    setUploading(true)
    setError('')
    setUploadProgress('')
    setUploadPercent(0)
    setUploadSpeed('')
    setUploadedBytes(0)
    
    try {
      const filesArray = Array.from(files)
      let uploadedCount = 0
      let failedCount = 0
      let totalSize = filesArray.reduce((sum, file) => sum + file.size, 0)
      let totalUploaded = 0
      const startTime = Date.now()
      setUploadStartTime(startTime)

      for (let i = 0; i < filesArray.length; i++) {
        // Sprawdź czy przesyłanie zostało anulowane
        if (abortController.signal.aborted) {
          break
        }

        const file = filesArray[i]
        const fileStartTime = Date.now()
        const previousFilesSize = filesArray.slice(0, i).reduce((sum, f) => sum + f.size, 0)
        
        setUploadProgress(`Przesyłanie ${i + 1}/${filesArray.length}: ${file.name}`)
        
        try {
          const formData = new FormData()
          formData.append('file', file)
          
          await apiClient.post('/file/upload', formData, {
            params: { path: currentPath || undefined },
            signal: abortController.signal, // Dodaj signal do anulowania
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total && !abortController.signal.aborted) {
                const fileLoaded = progressEvent.loaded
                const fileTotal = progressEvent.total
                const filePercent = Math.round((fileLoaded / fileTotal) * 100)
                
                // Oblicz całkowity postęp - używamy faktycznie przesłanych bajtów
                // previousFilesSize to suma już przesłanych plików (pełnych)
                // currentFileProgress to postęp aktualnego pliku
                const currentFileProgress = fileLoaded
                totalUploaded = previousFilesSize + currentFileProgress
                
                // Ogranicz do 99% dopóki wszystkie pliki nie są przesłane
                const totalPercent = Math.min(99, Math.round((totalUploaded / totalSize) * 100))
                
                setUploadPercent(totalPercent)
                setUploadedBytes(totalUploaded)
                
                // Oblicz prędkość
                const elapsed = (Date.now() - startTime) / 1000 // w sekundach
                if (elapsed > 0) {
                  const speed = totalUploaded / elapsed
                  setUploadSpeed(formatSpeed(speed))
                }
                
                setUploadProgress(`Przesyłanie ${i + 1}/${filesArray.length}: ${file.name} (${filePercent}%)`)
              }
            }
          })
          
          // Po zakończeniu przesłania pliku, dodaj jego pełny rozmiar
          totalUploaded = previousFilesSize + file.size
          uploadedCount++
          
          // Ustaw postęp na podstawie faktycznie przesłanych plików
          const completedPercent = Math.min(99, Math.round((totalUploaded / totalSize) * 100))
          setUploadPercent(completedPercent)
          setUploadedBytes(totalUploaded)
          
        } catch (err) {
          if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
            // Przesyłanie zostało anulowane
            break
          }
          failedCount++
          console.error(`Błąd podczas przesyłania ${file.name}:`, err)
        }
      }
      
      // Po zakończeniu wszystkich plików, ustaw 100%
      if (!abortController.signal.aborted) {
        setUploadPercent(100)
        setUploadedBytes(totalSize)
      }
      
      // Sprawdź czy nie zostało anulowane
      if (!abortController.signal.aborted) {
        setShowUploadModal(false)
        fetchFiles(currentPage, pageSize, currentPath)
        
        if (failedCount === 0) {
          showNotification('success', `Pomyślnie przesłano ${uploadedCount} plików`)
        } else {
          showNotification('warning', `Przesłano ${uploadedCount} plików, ${failedCount} nie powiodło się`)
        }
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        // Przesyłanie zostało anulowane - nie wyświetlaj błędu
        return
      }
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas przesyłania plików'
      setError(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress('')
      setUploadPercent(0)
      setUploadSpeed('')
      setUploadedBytes(0)
      setUploadStartTime(null)
      setUploadAbortController(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = ''
      }
    }
  }

  const handleFolderUpload = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Utwórz AbortController dla anulowania
    const abortController = new AbortController()
    setUploadAbortController(abortController)

    setUploading(true)
    setError('')
    setUploadProgress('')
    setUploadPercent(0)
    setUploadSpeed('')
    setUploadedBytes(0)
    
    try {
      // Pobierz strukturę folderów z FileList API
      const fileList = Array.from(files)
      const folderStructure = new Map()
      
      // Zbuduj strukturę folderów na podstawie webkitRelativePath
      fileList.forEach(file => {
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/')
          const folderName = parts[0]
          const relativePath = parts.slice(1).join('/')
          
          if (!folderStructure.has(folderName)) {
            folderStructure.set(folderName, [])
          }
          folderStructure.get(folderName).push({ file, relativePath })
        }
      })

      // Jeśli nie ma webkitRelativePath, traktuj jako zwykłe pliki
      if (folderStructure.size === 0) {
        await handleUpload(event)
        return
      }

      let uploadedCount = 0
      let failedCount = 0
      let totalFiles = fileList.length
      let currentFile = 0
      let totalSize = fileList.reduce((sum, file) => sum + file.size, 0)
      let totalUploaded = 0
      const startTime = Date.now()
      setUploadStartTime(startTime)

      // Prześlij każdy plik zachowując strukturę folderów
      for (const [folderName, files] of folderStructure) {
        if (abortController.signal.aborted) {
          break
        }
        for (const { file, relativePath } of files) {
          // Sprawdź czy przesyłanie zostało anulowane
          if (abortController.signal.aborted) {
            break
          }

          currentFile++
          const fileStartTime = Date.now()
          
          // Oblicz rozmiar już przesłanych plików (przed aktualnym)
          const previousFilesSize = fileList.slice(0, currentFile - 1).reduce((sum, f) => sum + f.size, 0)
          
          setUploadProgress(`Przesyłanie ${currentFile}/${totalFiles}: ${relativePath || file.name}`)
          
          try {
            const formData = new FormData()
            // Utwórz nowy File z tylko nazwą pliku (bez ścieżki)
            const fileWithName = new File([file], file.name, { type: file.type })
            formData.append('file', fileWithName)
            
            // Zbuduj ścieżkę docelową - folderName to nazwa głównego folderu, relativePath to ścieżka wewnątrz
            let targetDir = currentPath || ''
            if (relativePath) {
              // Jeśli jest relativePath, to znaczy że plik jest w podfolderze
              const pathParts = relativePath.split('/')
              const subFolderPath = pathParts.slice(0, -1).join('/')
              targetDir = targetDir 
                ? `${targetDir}/${folderName}${subFolderPath ? '/' + subFolderPath : ''}`
                : `${folderName}${subFolderPath ? '/' + subFolderPath : ''}`
            } else {
              // Plik jest bezpośrednio w głównym folderze
              targetDir = targetDir ? `${targetDir}/${folderName}` : folderName
            }
            
            await apiClient.post('/file/upload', formData, {
              params: { path: targetDir || undefined },
              signal: abortController.signal, // Dodaj signal do anulowania
              onUploadProgress: (progressEvent) => {
                if (progressEvent.total && !abortController.signal.aborted) {
                  const fileLoaded = progressEvent.loaded
                  const fileTotal = progressEvent.total
                  const filePercent = Math.round((fileLoaded / fileTotal) * 100)
                  
                  // Oblicz całkowity postęp - używamy faktycznie przesłanych bajtów
                  const currentFileProgress = fileLoaded
                  totalUploaded = previousFilesSize + currentFileProgress
                  
                  // Ogranicz do 99% dopóki wszystkie pliki nie są przesłane
                  const totalPercent = Math.min(99, Math.round((totalUploaded / totalSize) * 100))
                  
                  setUploadPercent(totalPercent)
                  setUploadedBytes(totalUploaded)
                  
                  // Oblicz prędkość
                  const elapsed = (Date.now() - startTime) / 1000 // w sekundach
                  if (elapsed > 0) {
                    const speed = totalUploaded / elapsed
                    setUploadSpeed(formatSpeed(speed))
                  }
                  
                  setUploadProgress(`Przesyłanie ${currentFile}/${totalFiles}: ${relativePath || file.name} (${filePercent}%)`)
                }
              }
            })
            
            // Po zakończeniu przesłania pliku, dodaj jego pełny rozmiar
            totalUploaded = previousFilesSize + file.size
            uploadedCount++
            
            // Ustaw postęp na podstawie faktycznie przesłanych plików
            const completedPercent = Math.min(99, Math.round((totalUploaded / totalSize) * 100))
            setUploadPercent(completedPercent)
            setUploadedBytes(totalUploaded)
            
          } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
              // Przesyłanie zostało anulowane
              break
            }
            failedCount++
            console.error(`Błąd podczas przesyłania ${file.name}:`, err)
          }
        }
      }
      
      // Po zakończeniu wszystkich plików, ustaw 100%
      if (!abortController.signal.aborted) {
        setUploadPercent(100)
        setUploadedBytes(totalSize)
      }
      
      // Sprawdź czy nie zostało anulowane
      if (!abortController.signal.aborted) {
        setShowUploadModal(false)
        fetchFiles(currentPage, pageSize, currentPath)
        
        if (failedCount === 0) {
          showNotification('success', `Pomyślnie przesłano folder z ${uploadedCount} plikami`)
        } else {
          showNotification('warning', `Przesłano ${uploadedCount} plików, ${failedCount} nie powiodło się`)
        }
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        // Przesyłanie zostało anulowane - nie wyświetlaj błędu
        return
      }
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas przesyłania folderu'
      setError(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress('')
      setUploadPercent(0)
      setUploadSpeed('')
      setUploadedBytes(0)
      setUploadStartTime(null)
      setUploadAbortController(null)
      if (folderInputRef.current) {
        folderInputRef.current.value = ''
      }
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification('error', 'Podaj nazwę folderu')
      return
    }

    setError('')
    try {
      await apiClient.post('/file/folder', null, {
        params: {
          folderName: newFolderName.trim(),
          path: currentPath || undefined
        }
      })
      
      setShowCreateFolderModal(false)
      setNewFolderName('')
      fetchFiles(currentPage, pageSize, currentPath)
      showNotification('success', 'Folder został utworzony')
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas tworzenia folderu'
      setError(errorMessage)
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize)
    setCurrentPage(1)
    localStorage.setItem('settings_pageSize', newSize.toString())
  }

  // Nasłuchuj zmian w localStorage (gdy ustawienia są zmieniane w Settings)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedPageSize = localStorage.getItem('settings_pageSize')
      if (savedPageSize) {
        const newPageSize = parseInt(savedPageSize)
        if (newPageSize !== pageSize) {
          setPageSize(newPageSize)
        }
      }
      
      const savedShowChecksum = localStorage.getItem('settings_showChecksumButton')
      if (savedShowChecksum !== null) {
        setShowChecksumButton(savedShowChecksum === 'true')
      }
      
      const savedDefaultView = localStorage.getItem('settings_defaultView')
      if (savedDefaultView && savedDefaultView !== defaultView) {
        setDefaultView(savedDefaultView)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    // Również sprawdzaj lokalnie (dla tej samej karty)
    const interval = setInterval(() => {
      handleStorageChange()
    }, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [pageSize, defaultView])

  // Użyj wyników globalnego wyszukiwania jeśli jest włączone
  const itemsToFilter = searchMode === 'global' ? globalSearchResults : items

  const filteredItems = itemsToFilter.filter(item => {
    const itemName = item.name || item.Name || ''
    const itemType = item.type || item.Type || 'file'
    const itemSize = item.size || item.Size || 0
    const lastModified = item.lastModified || item.LastModified || null
    
    // Ukryj folder .trash
    if (itemName === '.trash' || itemName.toLowerCase() === '.trash') {
      return false
    }
    
    // Filtrowanie po typie (folder/file)
    const typeMatch = filterType === 'all' || 
      (filterType === 'folder' && itemType === 'folder') ||
      (filterType === 'file' && itemType === 'file')
    
    if (!typeMatch) return false
    
    // Filtrowanie po nazwie
    let nameMatch = true
    if (filter) {
      if (useRegex) {
        try {
          const regex = new RegExp(filter, caseSensitive ? '' : 'i')
          nameMatch = regex.test(itemName)
        } catch (e) {
          // Nieprawidłowy regex - traktuj jako zwykły tekst
          nameMatch = caseSensitive 
            ? itemName.includes(filter)
            : itemName.toLowerCase().includes(filter.toLowerCase())
        }
      } else {
        nameMatch = caseSensitive 
          ? itemName.includes(filter)
          : itemName.toLowerCase().includes(filter.toLowerCase())
      }
    }
    
    if (!nameMatch) return false
    
    // Filtrowanie po rozszerzeniu
    if (filterExtension && itemType === 'file') {
      const extension = itemName.substring(itemName.lastIndexOf('.')).toLowerCase()
      const extensions = filterExtension.split(',').map(ext => {
        ext = ext.trim().toLowerCase()
        return ext.startsWith('.') ? ext : '.' + ext
      })
      if (!extensions.some(ext => extension === ext)) {
        return false
      }
    }
    
    // Filtrowanie po rozmiarze
    if (itemType === 'file') {
      if (filterSizeMin) {
        const minSize = parseSize(filterSizeMin)
        if (itemSize < minSize) return false
      }
      if (filterSizeMax) {
        const maxSize = parseSize(filterSizeMax)
        if (itemSize > maxSize) return false
      }
    }
    
    // Filtrowanie po dacie
    if (lastModified) {
      const itemDate = new Date(lastModified)
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (itemDate < fromDate) return false
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999)
        if (itemDate > toDate) return false
      }
    }
    
    return true
  })

  // Funkcja pomocnicza do parsowania rozmiaru (np. "10MB", "1GB", "500KB")
  const parseSize = (sizeStr) => {
    const trimmed = sizeStr.trim().toUpperCase()
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/)
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
    
    return value * (multipliers[unit] || 1)
  }
  
  const performGlobalSearch = async () => {
    setGlobalSearchLoading(true)
    setError('')
    try {
      const params = {
        page: currentPage,
        pageSize: pageSize
      }

      if (filter) {
        params.query = filter
      }
      if (filterExtension) {
        params.extension = filterExtension
      }
      if (filterSizeMin) {
        const minSize = parseSize(filterSizeMin)
        if (minSize > 0) {
          params.minSize = minSize
        }
      }
      if (filterSizeMax) {
        const maxSize = parseSize(filterSizeMax)
        if (maxSize > 0) {
          params.maxSize = maxSize
        }
      }
      if (filterDateFrom) {
        params.dateFrom = filterDateFrom
      }
      if (filterDateTo) {
        params.dateTo = filterDateTo
      }

      const response = await apiClient.get('/file/search', { params })
      
      if (response.data && response.data.items) {
        setGlobalSearchResults(response.data.items)
        setTotalCount(response.data.totalCount || 0)
        setTotalPages(response.data.totalPages || 1)
      }
    } catch (err) {
      console.error('Błąd podczas wyszukiwania globalnego:', err)
      const errorMessage = err.response?.data?.message || err.response?.data || 'Wystąpił błąd podczas wyszukiwania'
      setError(errorMessage)
    } finally {
      setGlobalSearchLoading(false)
    }
  }

  const clearAllFilters = () => {
    setFilter('')
    setFilterType('all')
    setFilterExtension('')
    setFilterSizeMin('')
    setFilterSizeMax('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setCaseSensitive(false)
    setUseRegex(false)
    setSearchMode('local')
    setGlobalSearchResults([])
  }
  
  const hasActiveFilters = filter || filterType !== 'all' || filterExtension || filterSizeMin || filterSizeMax || filterDateFrom || filterDateTo || caseSensitive || useRegex || searchMode === 'global'

  const getBreadcrumbs = () => {
    if (!currentPath || !user?.smbFolderPath) return []
    
    // Pobierz części ścieżki użytkownika i aktualnej ścieżki
    const userPathParts = user.smbFolderPath.split('/').filter(Boolean)
    const currentPathParts = currentPath.split('/').filter(Boolean)
    
    // Zwróć tylko części po folderze użytkownika
    return currentPathParts.slice(userPathParts.length)
  }

  const isImage = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(extension)
  }

  const isPdf = (fileName) => {
    return fileName.toLowerCase().endsWith('.pdf')
  }

  const isDocx = (fileName) => {
    return fileName.toLowerCase().endsWith('.docx')
  }

  const isTxt = (fileName) => {
    const textExtensions = ['.txt', '.text', '.log', '.md', '.json', '.xml', '.csv', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.htm', '.php', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.sql', '.sh', '.bat', '.ps1', '.yaml', '.yml', '.ini', '.conf', '.config']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return textExtensions.includes(extension)
  }

  const isVideo = (fileName) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp', '.ogv']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return videoExtensions.includes(extension)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Lista plików i folderów SMB</h1>
            {user && (
              <p className="text-blue-200 mt-2">
                Użytkownik: <span className="font-semibold">{user.username}</span>
                {user.role === 'Admin' && <span className="ml-2 px-2 py-1 bg-purple-500 rounded text-sm">Admin</span>}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-3 sm:py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-3 sm:py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ustawienia
            </button>
            <button
              onClick={async () => {
                setShowTrashModal(true)
                await fetchTrashItems()
              }}
              className="px-4 py-3 sm:py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Kosz
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-3 sm:py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              📤 Prześlij plik
            </button>
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="px-4 py-3 sm:py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              📁 Nowy folder
            </button>
            <button
              onClick={() => fetchFiles(currentPage, pageSize, currentPath)}
              disabled={loading}
              className="px-4 py-3 sm:py-2 bg-white text-blue-700 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              {loading ? 'Odświeżanie...' : 'Odśwież'}
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-3 sm:py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
            >
              Wyloguj
            </button>
          </div>
        </div>

        {/* Zaawansowana wyszukiwarka */}
        <div className="mb-6 bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="flex flex-col gap-4">
            {/* Główne wyszukiwanie */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={useRegex ? "Szukaj (regex)..." : "Szukaj po nazwie..."}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-2 sm:py-3 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base touch-manipulation min-h-[44px]"
                />
                {useRegex && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Regex
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Przełącznik trybu wyszukiwania */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 px-1">
                  <button
                    onClick={() => {
                      setSearchMode('local')
                      setGlobalSearchResults([])
                      fetchFiles(currentPage, pageSize, currentPath)
                    }}
                    className={`px-2 sm:px-3 py-2 rounded text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] flex items-center gap-1 ${
                      searchMode === 'local' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Wyszukiwanie w bieżącym folderze"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Lokalne</span>
                    <span className="sm:hidden">Lok</span>
                  </button>
                  <button
                    onClick={() => setSearchMode('global')}
                    className={`px-2 sm:px-3 py-2 rounded text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] flex items-center gap-1 ${
                      searchMode === 'global' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Wyszukiwanie we wszystkich folderach"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="hidden sm:inline">Wszędzie</span>
                    <span className="sm:hidden">Wsz</span>
                  </button>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-white text-blue-700 font-semibold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base touch-manipulation min-h-[44px]"
                >
                  <option value="all">Wszystko</option>
                  <option value="folder">Tylko foldery</option>
                  <option value="file">Tylko pliki</option>
                </select>
                <button
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 bg-white text-blue-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-all text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center gap-2 ${showAdvancedSearch ? 'ring-2 ring-blue-600' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="hidden sm:inline">Zaawansowane</span>
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden sm:inline">Wyczyść</span>
                  </button>
                )}
              </div>
            </div>

            {/* Zaawansowane opcje */}
            {showAdvancedSearch && (
              <div className="bg-white/5 rounded-lg p-4 space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Rozszerzenia */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Rozszerzenia (np. pdf,jpg,docx)
                    </label>
                    <input
                      type="text"
                      placeholder="pdf, jpg, docx..."
                      value={filterExtension}
                      onChange={(e) => setFilterExtension(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm touch-manipulation min-h-[44px]"
                    />
                  </div>

                  {/* Rozmiar min */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Rozmiar min (np. 1MB, 500KB)
                    </label>
                    <input
                      type="text"
                      placeholder="1MB, 500KB..."
                      value={filterSizeMin}
                      onChange={(e) => setFilterSizeMin(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm touch-manipulation min-h-[44px]"
                    />
                  </div>

                  {/* Rozmiar max */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Rozmiar max (np. 100MB, 2GB)
                    </label>
                    <input
                      type="text"
                      placeholder="100MB, 2GB..."
                      value={filterSizeMax}
                      onChange={(e) => setFilterSizeMax(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm touch-manipulation min-h-[44px]"
                    />
                  </div>

                  {/* Data od */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Data od
                    </label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm touch-manipulation min-h-[44px]"
                    />
                  </div>

                  {/* Data do */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Data do
                    </label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm touch-manipulation min-h-[44px]"
                    />
                  </div>

                  {/* Opcje zaawansowane */}
                  <div className="flex flex-col gap-3">
                    <label className="block text-sm font-medium text-white mb-2">
                      Opcje
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={caseSensitive}
                          onChange={(e) => setCaseSensitive(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>Wielkość liter</span>
                      </label>
                      <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useRegex}
                          onChange={(e) => setUseRegex(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>Wyrażenia regularne</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Szybkie filtry rozszerzeń */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Szybkie filtry:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['pdf', 'jpg', 'png', 'docx', 'xlsx', 'zip', 'mp4', 'mp3'].map(ext => (
                      <button
                        key={ext}
                        onClick={() => {
                          if (filterExtension.includes(ext)) {
                            setFilterExtension(filterExtension.split(',').filter(e => e.trim() !== ext).join(',').trim())
                          } else {
                            setFilterExtension(filterExtension ? `${filterExtension},${ext}` : ext)
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-sm transition-all touch-manipulation min-h-[36px] ${
                          filterExtension.toLowerCase().includes(ext)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        .{ext}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        {currentPath && user?.smbFolderPath && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setCurrentPath(user.smbFolderPath)
                setCurrentPage(1)
              }}
              className="px-3 py-1 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all text-sm"
            >
              🏠 {user.smbFolderPath.split('/').pop() || 'Główny'}
            </button>
            {getBreadcrumbs().map((part, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-white">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="px-3 py-1 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all text-sm"
                >
                  {part}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md">
            <p className="font-semibold mb-2">Błąd:</p>
            <p>{error}</p>
          </div>
        )}

        {(loading || globalSearchLoading) ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center text-white text-xl">
            {searchMode === 'global' ? 'Wyszukiwanie we wszystkich folderach...' : 'Ładowanie plików i folderów...'}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center text-white text-xl">
            {filter ? 'Brak wyników dla podanego filtru' : 'Brak plików i folderów w katalogu SMB'}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-sm text-white">
                {searchMode === 'global' ? (
                  <>
                    Wyszukiwanie globalne: {filteredItems.length} z {totalCount} wyników
                    {(filter || filterExtension) && ` dla "${filter || filterExtension}"`}
                  </>
                ) : (
                  <>
                    Wyświetlanie {filteredItems.length} z {totalCount} elementów
                    {filter && ` (filtrowane)`}
                  </>
                )}
                {selectedItems.size > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-600 rounded text-white font-semibold">
                    Zaznaczono: {selectedItems.size}
                  </span>
                )}
              </p>
              {selectedItems.size > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleMoveSelected}
                    className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Przenieś ({selectedItems.size})
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all transform active:scale-95 shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Usuń zaznaczone ({selectedItems.size})
                  </button>
                </div>
              )}
            </div>
            
            {/* Widok tabeli */}
            {defaultView === 'table' && (
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
                      <tr>
                        <th className="px-2 py-3 sm:py-4 text-left font-semibold text-sm sm:text-base w-10">
                          <input
                            type="checkbox"
                            checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="Zaznacz wszystkie"
                          />
                        </th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm sm:text-base">Typ</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm sm:text-base">Nazwa</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm sm:text-base">Rozmiar</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm sm:text-base">Data utworzenia</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm sm:text-base">Akcje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredItems.map((item, index) => {
                        const itemName = item.name || item.Name || 'Nieznany'
                        const itemType = item.type || item.Type || 'file'
                        const itemSize = item.size || item.Size || 0
                        const lastModified = item.lastModified || item.LastModified || null
                        const itemPath = item.path || item.Path || null
                        const isFolder = itemType === 'folder'
                        
                        return (
                          <tr key={index} className={`hover:bg-gray-50 transition-colors ${selectedItems.has(index) ? 'bg-blue-50' : ''}`}>
                            <td className="px-2 py-3 sm:py-4 align-middle w-10">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(index)}
                                onChange={() => toggleItemSelection(index)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 align-middle">
                              {isFolder ? (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800">
                                  📁 Folder
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                                  📄 Plik
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-gray-900 text-sm sm:text-base align-middle">
                              <div>
                                {isFolder ? '📁 ' : (isImage(itemName) ? '🖼️ ' : isPdf(itemName) ? '📕 ' : isDocx(itemName) ? '📝 ' : isVideo(itemName) ? '🎬 ' : '📄 ')}
                                {itemName}
                                {searchMode === 'global' && itemPath && itemPath !== itemName && (
                                  <span className="text-xs text-gray-500 ml-2 block sm:inline">
                                    ({itemPath})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm sm:text-base align-middle">
                              {isFolder ? '-' : formatFileSize(itemSize)}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-xs sm:text-sm align-middle">{formatDate(lastModified)}</td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 align-middle">
                              <div className="flex gap-2">
                                {isFolder ? (
                                  <>
                                    <button
                                      onClick={() => handleFolderClick(itemName, itemPath)}
                                      className="p-2 sm:p-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                      title="Otwórz folder"
                                    >
                                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h12a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDelete(itemName, itemType)}
                                      className="p-2 sm:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                      title="Usuń folder"
                                    >
                                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {(isImage(itemName) || isPdf(itemName) || isDocx(itemName) || isTxt(itemName) || isVideo(itemName)) && (
                                      <button
                                        onClick={() => handlePreview(itemName, itemType, itemPath)}
                                        className="p-2 sm:p-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        title="Podgląd"
                                      >
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDownload(itemName, itemType, itemPath)}
                                      className="p-2 sm:p-2.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                      title="Pobierz"
                                    >
                                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </button>
                                    {showChecksumButton && (
                                      <button
                                        onClick={() => handleChecksum(itemName, itemPath)}
                                        className="p-2 sm:p-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        title="Sprawdź checksum SHA256"
                                      >
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDelete(itemName, itemType)}
                                      className="p-2 sm:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                      title="Usuń plik"
                                    >
                                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Widok kafelków */}
            {defaultView === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item, index) => {
                const itemName = item.name || item.Name || 'Nieznany'
                const itemType = item.type || item.Type || 'file'
                const itemSize = item.size || item.Size || 0
                const lastModified = item.lastModified || item.LastModified || null
                const itemPath = item.path || item.Path || null
                const isFolder = itemType === 'folder'
                
                return (
                  <div key={index} className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-4 ${selectedItems.has(index) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(index)}
                          onChange={() => toggleItemSelection(index)}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {isFolder ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              📁 Folder
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📄 Plik
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-base break-words">
                          {isFolder ? '📁 ' : (isImage(itemName) ? '🖼️ ' : isPdf(itemName) ? '📕 ' : isDocx(itemName) ? '📝 ' : isVideo(itemName) ? '🎬 ' : '📄 ')}
                          {itemName}
                          {searchMode === 'global' && itemPath && itemPath !== itemName && (
                            <span className="text-xs text-gray-500 block mt-1 font-normal">
                              {itemPath}
                            </span>
                          )}
                        </h3>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          {!isFolder && <p>Rozmiar: {formatFileSize(itemSize)}</p>}
                          <p>Data: {formatDate(lastModified)}</p>
                        </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {isFolder ? (
                        <>
                          <button
                            onClick={() => handleFolderClick(itemName, itemPath)}
                            className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Otwórz folder"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h12a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(itemName, itemType)}
                            className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Usuń"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          {(isImage(itemName) || isPdf(itemName) || isDocx(itemName) || isTxt(itemName) || isVideo(itemName)) && (
                            <button
                              onClick={() => handlePreview(itemName, itemType, itemPath)}
                              className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Podgląd"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(itemName, itemType, itemPath)}
                            className="px-4 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Pobierz"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          {showChecksumButton && (
                            <button
                              onClick={() => handleChecksum(itemName, itemPath)}
                              className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Sprawdź checksum SHA256"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(itemName, itemType)}
                            className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors transform active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Usuń"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            )}

            {/* Paginacja - tylko jeśli nie ma filtrowania */}
            {!filter && totalPages > 1 && (
              <div className="mt-6">
                <div className="text-center mb-3 text-white text-sm">
                  Strona {currentPage} z {totalPages} (łącznie {totalCount} elementów)
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    «
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 rounded-lg transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-700 text-white font-semibold'
                              : 'bg-white text-blue-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    »
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    »»
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal przesyłania pliku */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 safe-area-inset" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Prześlij plik lub folder</h2>
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plik(i):</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleUpload}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Folder (zachowuje strukturę):</label>
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderUpload}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-3">
              {uploading ? (
                <button
                  onClick={handleCancelUpload}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
                >
                  Anuluj przesyłanie
                </button>
              ) : (
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                >
                  Zamknij
                </button>
              )}
            </div>
            {uploading && (
              <div className="mt-4">
                <p className="text-center text-gray-700 font-semibold mb-2">{uploadProgress || 'Przesyłanie...'}</p>
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Postęp: {uploadPercent}%</span>
                    {uploadSpeed && <span>Prędkość: {uploadSpeed}</span>}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-blue-800 h-3 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${uploadPercent}%` }}
                    ></div>
                  </div>
                </div>
                {uploadedBytes > 0 && (
                  <p className="text-center text-xs text-gray-500">
                    {formatFileSize(uploadedBytes)} przesłane
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal tworzenia folderu */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 safe-area-inset" onClick={() => setShowCreateFolderModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Utwórz nowy folder</h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Nazwa folderu"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateFolderModal(false)
                  setNewFolderName('')
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-all"
              >
                Utwórz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal podglądu */}
      {previewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0 sm:p-2 md:p-4 safe-area-inset" onClick={() => {
          // Zwolnij blob URL przy zamykaniu (tylko jeśli istnieje)
          if (previewItem.url && previewItem.url.startsWith('blob:')) {
            window.URL.revokeObjectURL(previewItem.url)
          }
          setPreviewItem(null)
        }}>
          <div className="bg-white rounded-none sm:rounded-lg max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
              <h3 className="text-base sm:text-xl font-bold text-gray-800 truncate flex-1 mr-2">{previewItem.name}</h3>
              <button
                onClick={() => {
                  // Zwolnij blob URL przy zamykaniu (tylko jeśli istnieje)
                  if (previewItem.url && previewItem.url.startsWith('blob:')) {
                    window.URL.revokeObjectURL(previewItem.url)
                  }
                  setPreviewItem(null)
                }}
                className="bg-red-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0"
                title="Zamknij"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 sm:p-4 preview-scrollable min-h-0">
              {previewItem.type === 'pdf' ? (
                <div className="w-full h-full min-h-0 sm:min-h-[70vh] preview-scrollable">
                  <object
                    data={previewItem.url}
                    type="application/pdf"
                    className="w-full h-full min-h-0 sm:min-h-[70vh]"
                    title={previewItem.name}
                  >
                    <iframe
                      src={previewItem.url}
                      className="w-full h-full min-h-0 sm:min-h-[70vh] border-0"
                      title={previewItem.name}
                      style={{ minHeight: 'calc(100vh - 120px)' }}
                    />
                    <p className="text-center text-gray-600 mt-4 text-sm px-4">
                      Nie można wyświetlić PDF. 
                      <a href={previewItem.url} download={previewItem.name} className="text-blue-700 hover:underline ml-2">
                        Pobierz plik
                      </a>
                    </p>
                  </object>
                </div>
              ) : previewItem.type === 'docx' ? (
                <div className="w-full h-full min-h-0 sm:min-h-[70vh] flex flex-col">
                  <div 
                    ref={docxPreviewRef}
                    className="flex-1 overflow-auto overflow-x-auto p-0 sm:p-3 md:p-6 bg-white preview-scrollable min-h-0"
                    style={{ 
                      maxHeight: 'calc(100vh - 120px)',
                      minHeight: 'calc(100vh - 120px)',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div className="mt-2 sm:mt-4 text-center border-t pt-2 sm:pt-4 flex-shrink-0">
                    <a 
                      href={previewItem.url} 
                      download={previewItem.name} 
                      className="text-blue-700 hover:underline font-medium text-sm sm:text-base"
                    >
                      Pobierz oryginalny plik Word
                    </a>
                  </div>
                </div>
              ) : previewItem.type === 'text' ? (
                <div className="w-full h-full min-h-0 sm:min-h-[70vh] flex flex-col">
                  <div className="flex-1 overflow-auto bg-gray-50 p-2 sm:p-4 md:p-6 preview-scrollable min-h-0">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="sticky top-0 bg-gray-100 px-2 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between z-10 flex-wrap gap-2">
                        <span className="text-xs text-gray-600 font-medium truncate flex-1 min-w-0">
                          {previewItem.content ? `${previewItem.content.length} znaków` : 'Plik jest pusty'}
                        </span>
                        <button
                          onClick={() => {
                            // Kopiuj do schowka
                            if (previewItem.content) {
                              navigator.clipboard.writeText(previewItem.content).then(() => {
                                showNotification('success', 'Skopiowano do schowka')
                              }).catch(() => {
                                showNotification('error', 'Nie udało się skopiować')
                              })
                            }
                          }}
                          className="px-2 sm:px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors flex-shrink-0"
                          title="Kopiuj do schowka"
                        >
                          📋 Kopiuj
                        </button>
                      </div>
                      <pre className="p-2 sm:p-4 text-xs sm:text-sm font-mono whitespace-pre-wrap break-words w-full overflow-x-auto overflow-y-auto preview-scrollable" style={{ maxHeight: 'calc(100vh - 180px)', minHeight: 'calc(100vh - 180px)' }}>
                        {previewItem.content || 'Plik jest pusty'}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 text-center border-t pt-2 sm:pt-4 flex-shrink-0">
                    <button
                      onClick={() => {
                        handleDownload(previewItem.name, 'file')
                      }}
                      className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm sm:text-base"
                    >
                      📥 Pobierz plik
                    </button>
                  </div>
                </div>
              ) : previewItem.type === 'video-large' ? (
                <div className="w-full h-full min-h-0 sm:min-h-[70vh] flex items-center justify-center bg-gray-50 p-4 sm:p-8">
                  <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🎬</div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                      Plik wideo jest zbyt duży
                    </h3>
                    <p className="text-gray-600 mb-2">
                      Rozmiar pliku: <span className="font-semibold">{formatFileSize(previewItem.size || 0)}</span>
                    </p>
                    <p className="text-gray-600 mb-6">
                      Pliki wideo większe niż 25MB mogą powodować problemy z odtwarzaniem w przeglądarce.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      Zalecamy pobranie pliku i odtworzenie go w zewnętrznym odtwarzaczu.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => {
                          handleDownload(previewItem.name, 'file')
                        }}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-base flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        📥 Pobierz plik
                      </button>
                      <button
                        onClick={() => {
                          // Jeśli użytkownik chce mimo wszystko odtworzyć
                          setPreviewItem({
                            ...previewItem,
                            type: 'video'
                          })
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-base"
                      >
                        Odtwórz mimo to
                      </button>
                    </div>
                  </div>
                </div>
              ) : previewItem.type === 'video' ? (
                <div className="w-full h-full min-h-0 sm:min-h-[70vh] flex items-center justify-center bg-black p-2 sm:p-4">
                  <VideoPlayer 
                    src={previewItem.url}
                    fileName={previewItem.name}
                    onError={() => {
                      showNotification('error', 'Nie można odtworzyć wideo')
                      setPreviewItem(null)
                    }}
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center preview-scrollable min-h-0" style={{ minHeight: 'calc(100vh - 120px)' }}>
                  <img
                    src={previewItem.url}
                    alt={previewItem.name}
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                    style={{ maxHeight: 'calc(100vh - 120px)' }}
                    onError={(e) => {
                      showNotification('error', 'Nie można wyświetlić obrazu')
                      if (previewItem.url && previewItem.url.startsWith('blob:')) {
                        window.URL.revokeObjectURL(previewItem.url)
                      }
                      setPreviewItem(null)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usuwania */}
      {/* Modal postępu usuwania */}
      {deleting && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 safe-area-inset">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Usuwanie</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {deleteProgress || 'Przenoszenie do kosza...'}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${deletePercent}%` }}
                >
                  {deletePercent > 15 && (
                    <span className="text-xs font-semibold text-white">{deletePercent}%</span>
                  )}
                </div>
              </div>
            </div>

            {deletingItem && (
              <div className="text-center">
                <p className="text-sm text-gray-600 truncate">
                  {deletingItem}
                </p>
              </div>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Proszę czekać, nie zamykaj okna...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal kosza */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Kosz</h2>
                <button
                  onClick={() => {
                    setShowTrashModal(false)
                    setTrashItems([])
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {trashLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Ładowanie kosza...</div>
                </div>
              ) : trashItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🗑️</div>
                  <p className="text-gray-500 text-lg">Kosz jest pusty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trashItems.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl">
                            {item.type === 'folder' ? '📁' : '📄'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{item.name}</div>
                            <div className="text-sm text-gray-500 truncate">{item.originalPath}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Usunięto: {formatDate(item.deletedAt)}
                              {item.expiresAt && ` • Wygasa: ${formatDate(item.expiresAt)}`}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-semibold text-gray-900">{formatFileSize(item.size)}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleRestoreFromTrash(item.id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors transform active:scale-95 min-h-[44px] touch-manipulation"
                            title="Przywróć"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteFromTrash(item.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors transform active:scale-95 min-h-[44px] touch-manipulation"
                            title="Usuń trwale"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal przenoszenia plików */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 safe-area-inset animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Przenieś pliki</h3>
              <button
                onClick={() => {
                  setShowMoveModal(false)
                  setMoveDestinationPath('')
                  setMoveBrowsePath('')
                  setMoveFolders([])
                  setMoveOverwrite(false)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                disabled={moving}
              >
                ×
              </button>
            </div>

            {moving ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">Przenoszenie plików...</p>
                  <p className="text-sm text-gray-600">{moveProgress || 'Przygotowywanie...'}</p>
                </div>

                {/* Pasek postępu */}
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center"
                      style={{ width: `${movePercent}%` }}
                    >
                      {movePercent > 10 && (
                        <span className="text-xs font-semibold text-white">{movePercent}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{formatFileSize(movedBytes)} / {formatFileSize(moveTotalSize)}</span>
                    {moveSpeed && <span>{moveSpeed}</span>}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Proszę czekać, nie zamykaj okna...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Wybierz folder docelowy dla <span className="font-semibold">{selectedItems.size}</span> {selectedItems.size === 1 ? 'elementu' : 'elementów'}:
                  </p>
                  
                  {/* Nawigacja po folderach */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <button
                        onClick={async () => {
                          const userPath = user?.smbFolderPath || ''
                          setMoveBrowsePath(userPath)
                          setMoveDestinationPath(userPath)
                          await fetchMoveFolders(userPath)
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-colors"
                      >
                        🏠 Główny folder
                      </button>
                      {moveBrowsePath && moveBrowsePath !== (user?.smbFolderPath || '') && (
                        <button
                          onClick={handleMoveFolderUp}
                          className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm transition-colors"
                        >
                          ⬆️ Wstecz
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const current = currentPath || (user?.smbFolderPath || '')
                          setMoveBrowsePath(current)
                          setMoveDestinationPath(current)
                          await fetchMoveFolders(current)
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm transition-colors"
                      >
                        📂 Bieżący folder
                      </button>
                    </div>
                    
                    {/* Ścieżka aktualna */}
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Aktualna ścieżka:
                      </label>
                      <div className="text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-300 break-all">
                        {moveBrowsePath || (user?.smbFolderPath || 'Główny folder')}
                      </div>
                    </div>

                    {/* Lista folderów do wyboru */}
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Wybierz folder:
                      </label>
                      <div className="bg-white rounded border border-gray-300 max-h-60 overflow-y-auto">
                        {moveFoldersLoading ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Ładowanie folderów...
                          </div>
                        ) : moveFolders.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Brak folderów w tym katalogu
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {/* Opcja wyboru bieżącego folderu */}
                            {moveBrowsePath && (
                              <button
                                onClick={() => setMoveDestinationPath(moveBrowsePath)}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                                  moveDestinationPath === moveBrowsePath ? 'bg-green-100 border-l-4 border-green-500' : ''
                                }`}
                              >
                                <span className="text-xl">📂</span>
                                <span className="flex-1 text-sm font-medium text-gray-900">
                                  <span className="text-gray-600">(Bieżący folder)</span>
                                </span>
                                {moveDestinationPath === moveBrowsePath && (
                                  <span className="text-green-600 font-semibold text-xs">✓ Wybrany</span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMoveDestinationPath(moveBrowsePath)
                                  }}
                                  className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                >
                                  Wybierz
                                </button>
                              </button>
                            )}
                            
                            {moveFolders.map((folder, index) => {
                              const folderName = folder.name || folder.Name || 'Nieznany'
                              const folderPath = folder.path || folder.Path || (moveBrowsePath ? `${moveBrowsePath}/${folderName}` : folderName)
                              const isSelected = moveDestinationPath === folderPath
                              
                              return (
                                <button
                                  key={index}
                                  onClick={() => handleMoveFolderClick(folderName, folderPath)}
                                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                                    isSelected ? 'bg-green-100 border-l-4 border-green-500' : ''
                                  }`}
                                >
                                  <span className="text-xl">📁</span>
                                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">{folderName}</span>
                                  {isSelected && (
                                    <span className="text-green-600 font-semibold text-xs">✓ Wybrany</span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setMoveDestinationPath(folderPath)
                                    }}
                                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                  >
                                    Wybierz
                                  </button>
                                  <span className="text-gray-400 text-xs">→</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ręczne wpisanie ścieżki */}
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Lub wpisz ścieżkę ręcznie:
                      </label>
                      <input
                        type="text"
                        value={moveDestinationPath}
                        onChange={(e) => setMoveDestinationPath(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        placeholder={user?.smbFolderPath || 'Ścieżka folderu docelowego'}
                      />
                    </div>
                  </div>

                  {/* Opcje */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer group relative">
                      <input
                        type="checkbox"
                        checked={moveOverwrite}
                        onChange={(e) => setMoveOverwrite(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        Nadpisz istniejące pliki/foldery
                        <span className="relative">
                          <svg 
                            className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {/* Tooltip */}
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="font-semibold mb-1">Co to oznacza?</div>
                            <div className="space-y-1">
                              <p><strong>Zaznaczone:</strong> Jeśli w folderze docelowym istnieje już plik/folder o tej samej nazwie, zostanie on usunięty i zastąpiony przenoszonym elementem.</p>
                              <p><strong>Niezaznaczone:</strong> Elementy o istniejących nazwach zostaną pominięte i pozostaną w oryginalnej lokalizacji.</p>
                            </div>
                            <div className="absolute bottom-0 left-4 transform translate-y-full">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Lista elementów do przeniesienia */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Elementy do przeniesienia:</p>
                    <div className="space-y-1">
                      {Array.from(selectedItems).slice(0, 5).map((index) => {
                        const item = filteredItems[index]
                        const itemName = item.name || item.Name || 'Nieznany'
                        const itemType = item.type || item.Type || 'file'
                        const isFolder = itemType === 'folder'
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-gray-200">
                            <span className={isFolder ? 'text-yellow-600 text-lg' : 'text-blue-600 text-lg'}>
                              {isFolder ? '📁' : '📄'}
                            </span>
                            <span className="text-gray-700 flex-1 truncate font-medium">{itemName}</span>
                          </div>
                        )
                      })}
                      {selectedItems.size > 5 && (
                        <p className="text-xs text-gray-500 italic text-center pt-1">
                          ... i {selectedItems.size - 5} więcej
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowMoveModal(false)
                      setMoveDestinationPath('')
                      setMoveBrowsePath('')
                      setMoveFolders([])
                      setMoveOverwrite(false)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleMoveFiles}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold transform hover:scale-105 active:scale-95"
                    disabled={!moveDestinationPath.trim()}
                  >
                    Przenieś
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && deleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 safe-area-inset animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Potwierdź usunięcie</h3>
                <p className="text-sm text-gray-500 mt-1">Ta operacja jest nieodwracalna</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Czy na pewno chcesz usunąć <span className="font-semibold text-gray-900">{deleteItem.type === 'folder' ? 'folder' : 'plik'}</span>{' '}
              <span className="font-semibold text-blue-700">"{deleteItem.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteItem(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
              >
                Anuluj
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold transform hover:scale-105 active:scale-95"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia zbiorowego */}
      {showDeleteSelectedConfirm && itemsToDelete.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 safe-area-inset animate-fadeIn" onClick={() => {
          setShowDeleteSelectedConfirm(false)
          setItemsToDelete([])
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-4 sm:p-6 transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Potwierdź usunięcie zbiorowe</h3>
                <p className="text-sm text-gray-500 mt-1">Ta operacja jest nieodwracalna</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4">
              Czy na pewno chcesz usunąć <span className="font-semibold text-red-600">{itemsToDelete.length}</span>{' '}
              {itemsToDelete.length === 1 ? 'element' : itemsToDelete.length < 5 ? 'elementy' : 'elementów'}?
            </p>

            {/* Lista elementów do usunięcia */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Elementy do usunięcia:</p>
              <div className="space-y-2">
                {itemsToDelete.slice(0, 10).map((item, index) => {
                  const itemName = item.name || item.Name || 'Nieznany'
                  const itemType = item.type || item.Type || 'file'
                  const isFolder = itemType === 'folder'
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-gray-200">
                      <span className={isFolder ? 'text-yellow-600 text-lg' : 'text-blue-600 text-lg'}>
                        {isFolder ? '📁' : '📄'}
                      </span>
                      <span className="text-gray-700 flex-1 truncate font-medium">{itemName}</span>
                      {isFolder && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-semibold">Folder</span>
                      )}
                    </div>
                  )
                })}
                {itemsToDelete.length > 10 && (
                  <p className="text-xs text-gray-500 italic text-center pt-2">
                    ... i {itemsToDelete.length - 10} więcej {itemsToDelete.length - 10 === 1 ? 'element' : 'elementów'}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Uwaga:</strong> Ta operacja jest nieodwracalna. Wszystkie zaznaczone pliki i foldery zostaną trwale usunięte.
                {itemsToDelete.some(item => (item.type || item.Type) === 'folder') && (
                  <span className="block mt-1">📁 Foldery zostaną usunięte wraz z całą zawartością.</span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteSelectedConfirm(false)
                  setItemsToDelete([])
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
              >
                Anuluj
              </button>
              <button
                onClick={confirmDeleteSelected}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Usuń wszystkie ({itemsToDelete.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal checksumu SHA256 */}
      {showChecksumModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 safe-area-inset animate-fadeIn" onClick={() => {
          setShowChecksumModal(false)
          setChecksumData(null)
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-4 sm:p-6 transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Checksum SHA256</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {checksumData?.fileName || 'Obliczanie...'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowChecksumModal(false)
                  setChecksumData(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {checksumLoading ? (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Obliczanie checksumu...</p>
              </div>
            ) : checksumData?.error ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <p className="text-red-800 font-semibold">Błąd</p>
                <p className="text-red-700 text-sm mt-1">{checksumData.error}</p>
              </div>
            ) : checksumData?.checksum ? (
              <>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Algorytm:</p>
                  <p className="text-lg font-mono text-gray-900">{checksumData.algorithm || 'SHA256'}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-purple-700 mb-2">Checksum:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-purple-900 break-all bg-white px-3 py-2 rounded border border-purple-200">
                      {checksumData.checksum}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(checksumData.checksum)
                        showNotification('success', 'Checksum skopiowany do schowka')
                      }}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                      title="Kopiuj do schowka"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Informacja:</strong> Checksum SHA256 służy do weryfikacji integralności pliku. Porównaj go z oryginalnym checksumem, aby upewnić się, że plik nie został zmodyfikowany.
                  </p>
                </div>
              </>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChecksumModal(false)
                  setChecksumData(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Powiadomienia */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 animate-slideInRight ${
          notification.type === 'success' ? 'bg-green-500' :
          notification.type === 'error' ? 'bg-red-500' :
          'bg-yellow-500'
        } text-white rounded-lg shadow-2xl p-4 min-w-[300px] max-w-md`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : notification.type === 'error' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <p className="ml-3 font-semibold flex-1">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileList
