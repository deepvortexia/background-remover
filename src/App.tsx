// src/App.tsx (Background Remover)
import { useState, useEffect, useRef } from 'react'
import './App.css'
import Header from './components/Header'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthModal } from './components/AuthModal'
import { PricingModal } from './components/PricingModal'
import { Notification } from './components/Notification'
import { useCredits } from './hooks/useCredits'
import { AuthCallback } from './pages/AuthCallback'
import { Gallery } from './components/Gallery'

const CREDIT_REFRESH_ERROR = 'Payment successful, but there was a temporary issue syncing your credits. Please refresh the page to see your updated balance.'
const PENDING_STRIPE_SESSION_KEY = 'pending_stripe_session'

const cleanUrlParams = () => {
  window.history.replaceState({}, '', window.location.pathname)
}

function AppContent() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')
  const [resultImage, setResultImage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [favRefreshKey, setFavRefreshKey] = useState(0)
  const [favSaving, setFavSaving] = useState(false)
  const [favSaved, setFavSaved] = useState(false)

  const { user, session, loading } = useAuth()
  const { hasCredits, refreshProfile } = useCredits()

  const processedSessionIdRef = useRef<string | null>(null)
  const processedPendingSessionRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    const handleStripeReturn = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      if (!sessionId) return
      if (processedSessionIdRef.current === sessionId) return
      if (loading) return
      processedSessionIdRef.current = sessionId
      if (user) {
        try {
          await refreshProfile()
          setShowNotification(true)
          cleanUrlParams()
        } catch {
          setError(CREDIT_REFRESH_ERROR)
        }
      } else {
        localStorage.setItem(PENDING_STRIPE_SESSION_KEY, sessionId)
        cleanUrlParams()
      }
    }
    handleStripeReturn()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  useEffect(() => {
    const processPendingStripeSession = async () => {
      if (!user) { processedPendingSessionRef.current = false; return }
      if (processedPendingSessionRef.current) return
      const pendingSession = localStorage.getItem(PENDING_STRIPE_SESSION_KEY)
      if (pendingSession) {
        processedPendingSessionRef.current = true
        try {
          await refreshProfile()
          localStorage.removeItem(PENDING_STRIPE_SESSION_KEY)
          setShowNotification(true)
        } catch {
          processedPendingSessionRef.current = false
          setError(CREDIT_REFRESH_ERROR)
        }
      }
    }
    processPendingStripeSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleFileSelect = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError('Please upload a JPG, PNG, or WEBP image.')
      return
    }
    setError('')
    setResultImage('')
    setUploadedFile(file)
    const url = URL.createObjectURL(file)
    setUploadedImageUrl(url)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  const removeBackground = async () => {
    if (!uploadedFile) { setError('Please upload an image first.'); return }
    if (!user) { setError('Please sign in to remove backgrounds'); setIsAuthModalOpen(true); return }
    if (!hasCredits) { setError('You have run out of credits. Please purchase more to continue.'); setIsPricingModalOpen(true); return }

    setIsLoading(true)
    setError('')
    setToast(null)

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(uploadedFile)
      })

      const token = session?.access_token
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 55000)

      let response: Response
      try {
        response = await fetch('/api/remove-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ imageBase64: base64, mimeType: uploadedFile.type }),
          signal: controller.signal,
        })
      } catch (fetchErr: any) {
        clearTimeout(timeout)
        if (fetchErr.name === 'AbortError') {
          setToast({ title: 'Request Timed Out', message: 'The processing took too long. Please try again. No credits were deducted.', type: 'warning' })
        } else {
          setToast({ title: 'Network Error', message: 'Could not connect to the server. Please check your connection and try again.', type: 'error' })
        }
        return
      }
      clearTimeout(timeout)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        switch (response.status) {
          case 401:
            setToast({ title: 'Session Expired', message: 'Your session has expired. Please refresh the page and sign in again. No credits were deducted.', type: 'error' })
            break
          case 402:
            setToast({ title: 'Insufficient Credits', message: "You don't have enough credits. Purchase more to continue.", type: 'warning' })
            setIsPricingModalOpen(true)
            break
          case 429:
            setToast({ title: 'Too Many Requests', message: 'Please wait a moment before trying again. No credits were deducted.', type: 'warning' })
            break
          case 503:
            setToast({ title: 'Service Unavailable', message: 'The background removal service is temporarily unavailable. Please try again in a few minutes. No credits were deducted.', type: 'error' })
            break
          default:
            setToast({ title: 'Processing Failed', message: (data.error || 'An unexpected error occurred') + '. No credits were deducted.', type: 'error' })
            break
        }
        return
      }

      const data = await response.json()
      setResultImage(data.image)
      await refreshProfile()
    } catch (err: any) {
      setToast({ title: 'Processing Failed', message: err.message || 'An unexpected error occurred.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset saved badge when a new result arrives
  useEffect(() => { setFavSaved(false) }, [resultImage])

  const saveFavorite = async () => {
    if (!resultImage || favSaving || favSaved) return
    if (!session) { setIsAuthModalOpen(true); return }
    setFavSaving(true)
    try {
      console.log('[saveFavorite] Posting to /api/favorites, token prefix:', session.access_token?.slice(0, 20))
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ result_url: resultImage, original_url: uploadedImageUrl || null }),
      })
      const body = await res.json().catch(() => ({}))
      console.log('[saveFavorite] Response status:', res.status, '| body:', JSON.stringify(body))
      if (res.ok) {
        setFavSaved(true)
        setFavRefreshKey(k => k + 1)
        setToast({ title: 'Added to Favorites!', message: 'Your image has been saved. View it in ⭐ Favorites.', type: 'success' })
      } else {
        setToast({ title: 'Could not save', message: body.error || 'Failed to save favorite.', type: 'error' })
      }
    } catch {}
    finally {
      setFavSaving(false)
    }
  }

  const downloadResult = async () => {
    if (!resultImage) return
    try {
      const response = await fetch(resultImage)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `background-removed-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download image. Please try right-clicking and "Save Image As..."')
    }
  }

  const resetAll = () => {
    setResultImage('')
    setUploadedFile(null)
    setUploadedImageUrl('')
    setError('')
  }

  return (
    <div className={`app ${isLoaded ? 'fade-in' : ''}`}>
      <Header />

      <div className="app-container">
        <div className="particles">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((left, i) => (
            <div key={i} className="particle" style={{ left: `${left}%`, animationDelay: `${i * 0.5}s` }}></div>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="prompt-section-wrapper">
          <h3 className="prompt-section-title"><span className="title-icon">🖼️</span>Upload Your Image</h3>

          <div
            className={`upload-zone${isDragging ? ' upload-zone-dragging' : ''}${uploadedImageUrl ? ' upload-zone-has-image' : ''}`}
            onClick={() => !uploadedImageUrl && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {uploadedImageUrl ? (
              <div className="upload-zone-preview">
                <img src={uploadedImageUrl} alt="Uploaded" className="upload-preview-img" />
                <button
                  className="upload-change-btn"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div className="upload-zone-placeholder">
                <span className="upload-icon">📁</span>
                <p className="upload-text">Drop your image here or <span className="upload-link">browse</span></p>
                <p className="upload-hint">Supports JPG, PNG, WEBP</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          <button
            className="generate-btn-enhanced"
            onClick={removeBackground}
            disabled={isLoading || !uploadedFile}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            {isLoading ? (
              <><span className="spinner"></span><span className="btn-text">Removing Background...</span></>
            ) : (
              <><span className="btn-icon">✂️</span><span className="btn-text">Remove Background</span></>
            )}
          </button>
        </div>

        {error && <div className="error-message"><span className="error-icon">⚠️</span>{error}</div>}

        {isLoading && (
          <div className="loading-section">
            <div className="loading-spinner-large"></div>
            <p className="loading-message">Removing background... ✨</p>
            <p className="loading-hint">This usually takes 3-8 seconds</p>
          </div>
        )}

        {resultImage && !isLoading && (
          <div className="result-section slide-up">
            <h2 className="result-title">Background Removed ✨</h2>
            <div className="before-after-container">
              <div className="before-after-card">
                <p className="before-after-label">Before</p>
                <img src={uploadedImageUrl} alt="Original" className="generated-image fade-in-image" loading="lazy" />
              </div>
              <div className="before-after-divider">→</div>
              <div className="before-after-card">
                <p className="before-after-label">After</p>
                <div className="transparent-bg-checker">
                  <img src={resultImage} alt="Background removed" className="generated-image fade-in-image" loading="lazy" />
                </div>
              </div>
            </div>
            <div className="action-buttons">
              <button onClick={downloadResult} className="action-btn download-btn"><span>📥</span> Download PNG</button>
              <button onClick={saveFavorite} className="action-btn save-btn" disabled={favSaving || favSaved}>
                <span>⭐</span> {favSaved ? 'Added!' : favSaving ? 'Saving...' : 'Add to Favorites'}
              </button>
              <button onClick={resetAll} className="action-btn regenerate-btn"><span>🔄</span> New Image</button>
            </div>
          </div>
        )}
      </div>

      <Gallery refreshKey={favRefreshKey} />

      <section className="ecosystem-section">
        <h2 className="ecosystem-heading">Complete AI Ecosystem</h2>
        <div className="ecosystem-grid">
          {[
            { name: 'Emoticons',  icon: '😃', desc: 'Custom emoji creation',          status: 'Available Now',  isActive: true,  href: 'https://emoticons.deepvortexai.art', isCurrent: false },
            { name: 'Image Gen',  icon: '🎨', desc: 'AI artwork',                      status: 'Available Now',  isActive: true,  href: 'https://images.deepvortexai.art',    isCurrent: false },
            { name: 'Remove BG',  icon: '✂️', desc: 'Remove backgrounds instantly',    status: 'Available Now',  isActive: true,  href: '#',                                  isCurrent: true  },
            { name: 'More Tools', icon: '✨', desc: 'Expanding soon',                  status: 'In Development', isActive: false },
          ].map((tool, idx) => (
            <div
              key={idx}
              className={`ecosystem-card ${tool.isActive ? 'eco-card-active' : 'eco-card-inactive'}${tool.isCurrent ? ' eco-glow' : ''}`}
              onClick={() => { if (tool.isActive && tool.href && !tool.isCurrent) window.location.href = tool.href }}
              role={tool.isActive && !tool.isCurrent ? 'button' : 'presentation'}
              style={{ cursor: tool.isActive && !tool.isCurrent ? 'pointer' : 'default' }}
            >
              <div className="eco-icon">{tool.icon}</div>
              <h3 className="eco-title">{tool.name}</h3>
              <p className="eco-desc">{tool.desc}</p>
              <div className="eco-status-container">
                <span className={`eco-status-badge ${tool.isActive ? 'eco-badge-active' : 'eco-badge-upcoming'}`}>
                  {tool.status}
                </span>
                {tool.isCurrent && <div className="eco-current-label">CURRENT TOOL</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <a href="https://deepvortexai.art" className="footer-tagline footer-tagline-link">Deep Vortex AI - Building the complete AI creative ecosystem</a>
        <div className="footer-social">
          <a href="https://www.tiktok.com/@deepvortexai" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
            </svg>
            TikTok
          </a>
          <a href="https://x.com/deepvortexart" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X
          </a>
          <a href="https://deepvortexai.quora.com/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12.071 0C5.4 0 0 5.4 0 12.071c0 6.67 5.4 12.071 12.071 12.071 6.67 0 12.071-5.4 12.071-12.071C24.142 5.4 18.742 0 12.07 0zm2.028 18.383c-.5-.998-.954-1.88-1.907-1.88h-.213l1.193-2.647h-.002c-.362.12-.743.18-1.128.18-2.287 0-3.996-1.837-3.996-4.177s1.709-4.177 3.997-4.177 3.996 1.837 3.996 4.177c0 1.29-.496 2.432-1.32 3.29.277.397.533.812.793 1.227l.15.238c.278.442.55.886.832 1.33l-2.395 2.44zm-2.057-4.997c1.18 0 1.94-1.083 1.94-2.51 0-1.428-.76-2.511-1.94-2.511s-1.94 1.083-1.94 2.511c0 1.428.76 2.511 1.94 2.511z"/>
            </svg>
            Quora
          </a>
          <a href="mailto:admin@deepvortexai.xyz" className="footer-contact-btn">Contact Us</a>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
      {showNotification && (
        <Notification title="Payment Successful!" message="Your credits have been added to your account." onClose={() => setShowNotification(false)} />
      )}
      {toast && (
        <Notification title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

function App() {
  const path = window.location.pathname
  if (path === '/auth/callback') {
    return (
      <AuthProvider>
        <AuthCallback />
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
