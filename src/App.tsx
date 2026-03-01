// src/App.tsx  (Emoticons)
// Seul changement : détecter /auth/callback et afficher AuthCallback

import { useState, useEffect, useRef } from 'react'
import './App.css'
import Header from './components/Header'
import PlatformGuideModal from './components/PlatformGuideModal'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthModal } from './components/AuthModal'
import { PricingModal } from './components/PricingModal'
import { Notification } from './components/Notification'
import { useCredits } from './hooks/useCredits'
import { AuthCallback } from './pages/AuthCallback'  // ← NOUVEAU

const loadingMessages = [
  "Creating magic... ✨",
  "Brewing pixels... 🎨",
  "Summoning AI spirits... 🌀",
  "Crafting your emoji... 🔮",
  "Mixing colors... 🎭",
  "Generating awesomeness... 🚀"
];

const quickIdeas = [
  { emoji: '🧙', text: 'Wizard cat casting spell' },
  { emoji: '🤖', text: 'Robot crying rainbow tears' },
  { emoji: '🐉', text: 'Dragon eating sushi roll' },
  { emoji: '👻', text: 'Ghost playing electric guitar' },
  { emoji: '🐼', text: 'Panda astronaut floating space' },
  { emoji: '🐰', text: 'Devil bunny holding flowers' },
  { emoji: '🦈', text: 'Shark wearing top hat' },
  { emoji: '👽', text: 'Alien cooking ramen noodles' },
];

const CREDIT_REFRESH_ERROR = 'Payment successful, but there was a temporary issue syncing your credits. Please refresh the page to see your updated balance.'
const PENDING_STRIPE_SESSION_KEY = 'pending_stripe_session'

const cleanUrlParams = () => {
  window.history.replaceState({}, '', window.location.pathname)
}

function AppContent() {
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])
  const [imagesGenerated, setImagesGenerated] = useState(0)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [toast, setToast] = useState<{title:string;message:string;type:'success'|'error'|'warning'}|null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  
  const { user, session, loading } = useAuth()
  const { hasCredits, refreshProfile } = useCredits()

  const processedSessionIdRef = useRef<string | null>(null)
  const processedPendingSessionRef = useRef(false)
  const promptInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsLoaded(true)
    const count = parseInt(localStorage.getItem('images-generated') || '0', 10)
    setImagesGenerated(count)
  }, [])

  useEffect(() => {
    const handleStripeReturn = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      if (!sessionId) return
      if (processedSessionIdRef.current === sessionId) return
      console.log('Stripe session_id detected:', sessionId)
      if (loading) return
      processedSessionIdRef.current = sessionId
      if (user) {
        try {
          await refreshProfile()
          setShowNotification(true)
          cleanUrlParams()
        } catch (error) {
          console.error('Failed to refresh credits after payment:', error)
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
        } catch (error) {
          processedPendingSessionRef.current = false
          setError(CREDIT_REFRESH_ERROR)
        }
      }
    }
    processPendingStripeSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const generateEmoticon = async () => {
    if (!prompt.trim()) { setError('Please enter a description!'); return }
    if (!user) { setError('Please sign in to generate emoticons'); setIsAuthModalOpen(true); return }
    if (!hasCredits) { setError('You have run out of credits. Please purchase more to continue.'); setIsPricingModalOpen(true); return }
    setIsLoading(true)
    setError('')
    setToast(null)
    setGeneratedImage('')
    setIsFavorited(false)
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])
    try {
      const token = session?.access_token
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)
      let response: Response
      try {
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        })
      } catch (fetchErr: any) {
        clearTimeout(timeout)
        if (fetchErr.name === 'AbortError') {
          setToast({ title: 'Request Timed Out', message: 'The generation took too long. Please try again. No credits were deducted.', type: 'warning' })
        } else {
          setToast({ title: 'Network Error', message: 'Could not connect to the server. Please check your connection and try again. No credits were deducted.', type: 'error' })
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
            setToast({ title: 'Insufficient Credits', message: "You don't have enough credits. Purchase more to continue generating.", type: 'warning' })
            setIsPricingModalOpen(true)
            break
          case 429:
            setToast({ title: 'Too Many Requests', message: 'Please wait a moment before generating again. No credits were deducted.', type: 'warning' })
            break
          case 503:
            setToast({ title: 'Service Unavailable', message: 'The emoticon generation service is temporarily unavailable. Please try again in a few minutes. No credits were deducted.', type: 'error' })
            break
          default:
            setToast({ title: 'Generation Failed', message: (data.error || 'An unexpected error occurred') + '. No credits were deducted.', type: 'error' })
            break
        }
        return
      }
      const data = await response.json()
      setGeneratedImage(data.image)
      saveToHistory(prompt, data.image)
      const newCount = imagesGenerated + 1
      setImagesGenerated(newCount)
      localStorage.setItem('images-generated', newCount.toString())
      await refreshProfile()
    } catch (err: any) {
      setToast({ title: 'Generation Failed', message: (err.message || 'An unexpected error occurred') + '. No credits were deducted.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const saveToHistory = (prompt: string, imageUrl: string) => {
    try {
      const history = JSON.parse(localStorage.getItem('emoji-history') || '[]')
      const timestamp = Date.now()
      const updated = [{ id: timestamp.toString(), prompt, imageUrl, timestamp }, ...history].slice(0, 20)
      localStorage.setItem('emoji-history', JSON.stringify(updated))
    } catch (error) { console.error('Error saving to history:', error) }
  }

  const regenerate = async () => { if (prompt) await generateEmoticon() }

  const handleAddToFavorites = async () => {
    if (!generatedImage) return
    if (!session?.access_token) { setError('Please sign in to add favorites'); return }
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ imageUrl: generatedImage, prompt }),
      })
      if (response.ok) {
        setIsFavorited(true)
      } else {
        setError('Failed to add to favorites')
      }
    } catch {
      setError('Failed to add to favorites')
    }
  }

  const downloadImage = async () => {
    if (!generatedImage) return
    try {
      const link = document.createElement('a')
      link.href = `/api/download?url=${encodeURIComponent(generatedImage)}`
      link.download = `emoticon-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert('Failed to download image. Please try right-clicking and "Save Image As..."')
    }
  }

  return (
    <div className={`app ${isLoaded ? 'fade-in' : ''}`}>
      <Header />
      
      <div className="suggestions-compact-section">
        <div className="suggestion-row">
          <h4 className="suggestion-row-title">💡 Quick Ideas</h4>
          <div className="quick-ideas-grid">
            {quickIdeas.map((item) => (
              <button
                key={item.text}
                className="suggestion-tag-compact quick-idea-btn"
                onClick={() => { setPrompt(item.text); setTimeout(() => promptInputRef.current?.focus(), 0) }}
              >
                <span className="tag-emoji">{item.emoji}</span><span className="tag-text">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="app-container">
        <div className="particles">
          {[10,20,30,40,50,60,70,80,90].map((left, i) => (
            <div key={i} className="particle" style={{ left: `${left}%`, animationDelay: `${i * 0.5}s` }}></div>
          ))}
        </div>
      </div>
      
      <div className="main-content">
        <div className="prompt-section-wrapper">
          <h3 className="prompt-section-title"><span className="title-icon">✨</span>Create Your Emoticon</h3>
          <div className="prompt-input-container">
            <input
              ref={promptInputRef}
              className="prompt-input-enhanced"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your emoticon (e.g., happy cosmic cat)"
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && generateEmoticon()}
              disabled={isLoading}
            />
            <button className="generate-btn-enhanced" onClick={generateEmoticon} disabled={isLoading || !prompt.trim()}>
              {isLoading ? (
                <><span className="spinner"></span><span className="btn-text">Generating...</span></>
              ) : (
                <><span className="btn-icon">🎨</span><span className="btn-text">Generate</span></>
              )}
            </button>
          </div>
        </div>

        {error && <div className="error-message"><span className="error-icon">⚠️</span>{error}</div>}

        {isLoading && (
          <div className="loading-section">
            <div className="loading-spinner-large"></div>
            <p className="loading-message">{loadingMessage}</p>
            <p className="loading-hint">This usually takes 3-5 seconds</p>
          </div>
        )}

        {generatedImage && !isLoading && (
          <div className="result-section slide-up">
            <h2 className="result-title">Your Emoticon ✨<span className="generation-time">Generated in ~4s</span></h2>
            <div className="image-container">
              <img src={generatedImage} alt="Generated emoticon" className="generated-image fade-in-image" loading="lazy" />
            </div>
            <div className="action-buttons">
              <button onClick={downloadImage} className="action-btn download-btn"><span>📥</span> Download</button>
              <button
                onClick={handleAddToFavorites}
                className={`action-btn favorite-btn ${isFavorited ? 'favorited' : ''}`}
                disabled={isFavorited}
              >
                <span>{isFavorited ? '✅' : '⭐'}</span> {isFavorited ? 'Added!' : 'Favorite'}
              </button>
              <button onClick={regenerate} className="action-btn regenerate-btn"><span>🔄</span> Regenerate</button>
              <button className="action-btn copy-btn" onClick={() => { navigator.clipboard.writeText(generatedImage); alert('Image URL copied!') }}>
                <span>🔗</span> Copy URL
              </button>
            </div>
            <button className="platform-guide-button" onClick={() => setIsGuideOpen(true)}>📱 How to Use on Social Platforms</button>
          </div>
        )}

      </div>

      <section className="ecosystem-section">
        <h2 className="ecosystem-heading">Complete AI Ecosystem</h2>
        <div className="ecosystem-grid">
          {[
            { name: 'Emoticons', icon: '😃', desc: 'Custom emoji creation',          status: 'Available Now',   isActive: true,  href: 'https://emoticons.deepvortexai.art', isCurrent: true  },
            { name: 'Image Gen',  icon: '🎨', desc: 'AI artwork',                    status: 'Available Now',   isActive: true,  href: 'https://images.deepvortexai.art',    isCurrent: false },
            { name: 'Remove Background', icon: '🎨', desc: 'Remove backgrounds instantly', status: 'Coming Soon', isActive: false },
            { name: 'More Tools', icon: '✨', desc: 'Expanding soon',                status: 'In Development', isActive: false },
          ].map((tool, idx) => (
            <div
              key={idx}
              className={`ecosystem-card ${tool.isActive ? 'eco-card-active' : 'eco-card-inactive'}${tool.isCurrent ? ' eco-glow' : ''}`}
              onClick={() => { if (tool.isActive && tool.href) window.location.href = tool.href; }}
              role={tool.isActive ? 'button' : 'presentation'}
              style={{ cursor: tool.isActive ? 'pointer' : 'default' }}
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
            </svg>
            TikTok
          </a>
          <a href="mailto:admin@deepvortexai.xyz" className="footer-contact-btn">Contact Us</a>
        </div>
      </footer>

      <PlatformGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
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
  // ✅ Détecter /auth/callback avant de rendre l'app normale
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
