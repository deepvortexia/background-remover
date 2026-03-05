import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import './Gallery.css'

interface FavoriteItem {
  id: string
  resultUrl: string
  originalUrl: string | null
  createdAt: number
}

interface GalleryProps {
  refreshKey?: number
}

export function Gallery({ refreshKey }: GalleryProps) {
  const { session } = useAuth()
  const token = session?.access_token

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(false)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())

  const loadFavorites = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites((data.favorites || []).map((f: any) => ({
          id: f.id,
          resultUrl: f.result_url,
          originalUrl: f.original_url || null,
          createdAt: new Date(f.created_at).getTime(),
        })))
      }
    } catch {}
    finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites, refreshKey])

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setFavorites(prev => prev.filter(f => f.id !== id))
    } catch {}
  }

  const handleDownload = async (resultUrl: string, id: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    try {
      const res = await fetch(resultUrl, { mode: 'cors' })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      if (isMobile) {
        const filename = `bg-removed-${id.slice(0, 8)}.png`
        const file = new File([blob], filename, { type: blob.type })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
          return
        }
        window.open(resultUrl, '_blank')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bg-removed-${id.slice(0, 8)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Please try right-clicking and "Save Image As..."')
    }
  }

  if (!token || (favorites.length === 0 && !loading)) return null

  return (
    <section className="favorites-section">
      <h2 className="favorites-heading">❤️ Saved Favorites</h2>

      {loading ? (
        <p className="favorites-loading">Loading...</p>
      ) : (
        <div className="gallery-grid">
          {favorites.map((item) => (
            <div key={item.id} className="gallery-item">
              {brokenImages.has(item.id) ? (
                <div className="image-placeholder-broken">
                  <span className="placeholder-icon">😕</span>
                  <p className="placeholder-text">Image unavailable</p>
                </div>
              ) : (
                <div className="transparent-bg-checker gallery-item-img-wrap">
                  <img
                    src={item.resultUrl}
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
                onClick={(e) => { e.stopPropagation(); handleDownload(item.resultUrl, item.id) }}
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
          ))}
        </div>
      )}
    </section>
  )
}
