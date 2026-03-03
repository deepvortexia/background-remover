import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import './Gallery.css'

interface FavoriteItem {
  id: string
  imageUrl: string
  createdAt: number
}

interface GalleryProps {
  isOpen?: boolean
  onClose?: () => void
  pendingImage?: string
}

const LS_KEY = 'bg-favorites'

function loadLocal(): FavoriteItem[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function saveLocal(items: FavoriteItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export function Gallery({ isOpen: externalIsOpen, onClose: externalOnClose, pendingImage }: GalleryProps = {}) {
  const { session } = useAuth()
  const token = session?.access_token

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())
  const [savingPending, setSavingPending] = useState(false)
  const [pendingSaved, setPendingSaved] = useState(false)

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalOnClose
    ? (value: boolean) => { if (!value) externalOnClose() }
    : setInternalIsOpen

  const loadFavorites = useCallback(async () => {
    if (token) {
      try {
        const res = await fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setFavorites((data.favorites || []).map((f: any) => ({
            id: f.id,
            imageUrl: f.image_url,
            createdAt: new Date(f.created_at).getTime(),
          })))
          return
        }
      } catch {}
    }
    setFavorites(loadLocal())
  }, [token])

  useEffect(() => {
    if (isOpen) {
      loadFavorites()
      setPendingSaved(false)
    }
  }, [isOpen, loadFavorites])

  // Reset saved state when a new result image arrives
  useEffect(() => { setPendingSaved(false) }, [pendingImage])

  // Load count for toggle button even when closed
  useEffect(() => {
    if (!isOpen) loadFavorites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleSavePending = async () => {
    if (!pendingImage || savingPending || pendingSaved) return
    setSavingPending(true)
    try {
      if (token) {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: pendingImage }),
        })
        if (res.ok) {
          setPendingSaved(true)
          await loadFavorites()
        }
      } else {
        const items = loadLocal()
        const newItem: FavoriteItem = { id: crypto.randomUUID(), imageUrl: pendingImage, createdAt: Date.now() }
        saveLocal([newItem, ...items])
        setFavorites(prev => [newItem, ...prev])
        setPendingSaved(true)
      }
    } finally {
      setSavingPending(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (token) {
      try {
        await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {}
    } else {
      saveLocal(favorites.filter(f => f.id !== id))
    }
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  const handleDownload = async (imageUrl: string, id: string) => {
    try {
      const res = await fetch(imageUrl, { mode: 'cors' })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bg-removed-${id.slice(0, 8)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      window.open(imageUrl, '_blank')
    }
  }

  if (!isOpen && externalIsOpen === undefined) {
    return (
      <button className="gallery-toggle" onClick={() => setIsOpen(true)}>
        ⭐ Favorites ({favorites.length})
      </button>
    )
  }

  if (!isOpen) return null

  return (
    <div className="gallery-modal">
      <div className="gallery-content">
        <div className="gallery-header">
          <h2>⭐ Saved Favorites</h2>
          <button onClick={() => setIsOpen(false)} className="gallery-close">✕</button>
        </div>

        {pendingImage && (
          <div className="gallery-pending">
            <div className="gallery-pending-preview transparent-bg-checker">
              <img src={pendingImage} alt="Current result" />
            </div>
            <button
              className="gallery-save-btn"
              onClick={handleSavePending}
              disabled={savingPending || pendingSaved}
            >
              {pendingSaved ? '✓ Saved' : savingPending ? 'Saving...' : '⭐ Save to Favorites'}
            </button>
          </div>
        )}

        <div className="gallery-grid">
          {favorites.length === 0 ? (
            <p className="gallery-empty">No favorites saved yet. Remove a background and save it here!</p>
          ) : (
            favorites.map((item) => (
              <div key={item.id} className="gallery-item">
                {brokenImages.has(item.id) ? (
                  <div className="image-placeholder-broken">
                    <span className="placeholder-icon">😕</span>
                    <p className="placeholder-text">Image unavailable</p>
                  </div>
                ) : (
                  <div className="transparent-bg-checker gallery-item-img-wrap">
                    <img
                      src={item.imageUrl}
                      alt="Saved result"
                      loading="lazy"
                      decoding="async"
                      onError={() => setBrokenImages(prev => new Set(prev).add(item.id))}
                      onLoad={() => setBrokenImages(prev => { const s = new Set(prev); s.delete(item.id); return s })}
                    />
                  </div>
                )}
                <div className="gallery-item-info">
                  <p className="gallery-date">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  className="gallery-download-btn"
                  onClick={(e) => { e.stopPropagation(); handleDownload(item.imageUrl, item.id) }}
                  disabled={brokenImages.has(item.id)}
                  title="Download"
                  aria-label="Download image"
                >💾</button>
                <button
                  className="gallery-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >🗑️</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
