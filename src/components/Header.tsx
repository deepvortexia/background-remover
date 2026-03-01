import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'
import { PricingModal } from './PricingModal'
import { Gallery } from './Gallery'
import './Header.css'

export default function Header() {
  const { user, profile, signOut, loading, refreshProfile } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [showRetry, setShowRetry] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true' && user) {
      refreshProfile()
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [user, refreshProfile])

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
        setShowRetry(true)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
      setShowRetry(false)
    }
  }, [loading])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleRetry = () => {
    setShowRetry(false)
    setLoadingTimeout(false)
    if (user) refreshProfile()
  }

  const handleBuyCreditsClick = () => {
    if (!user) setShowAuthModal(true)
    else setShowPricingModal(true)
  }

  const getAvatarUrl = () => user?.user_metadata?.avatar_url || profile?.avatar_url || null

  const getUserDisplayName = () => profile?.full_name || profile?.email?.split('@')[0] || 'User'

  const getUserInitials = () => {
    const name = getUserDisplayName()
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase() || 'U'
  }

  return (
    <>
      <header className="hub-header" role="banner">
        <a
          href="https://deepvortexai.art"
          className="back-to-hub-link"
          onClick={(e) => {
            if (window.parent !== window) {
              e.preventDefault()
              window.parent.postMessage({ type: 'deepvortex-navigate', url: 'https://deepvortexai.art' }, 'https://deepvortexai.art')
            }
          }}
        >
          ← Back to Hub
        </a>

        <div className="logo-display-zone">
          <div className="orbit-ring-one" />
          <div className="orbit-ring-two" />
          <div className="orbit-ring-three" />
          <img
            src="/deepgoldremoveetiny.png"
            alt="Deep Vortex"
            className="brand-logo-image"
          />
        </div>

        <h1 className="brand-title-text">DΞΞP VORTΞX AI</h1>
        <p className="primary-tagline">Your AI Tools Ecosystem</p>

        <div className="hub-pills-container">
          <div className="hub-pill credits-pill">
            <span className="pill-icon">🏆</span>
            <span className="pill-text">
              {user ? `${profile?.credits ?? 0} credits` : 'Sign in for credits'}
            </span>
          </div>

          <button
            className="hub-pill buy-credits-pill"
            onClick={handleBuyCreditsClick}
            title="Purchase more credits"
          >
            <span className="pill-icon">💳</span>
            <span className="pill-text">Buy Credits</span>
          </button>

          <button
            className="hub-pill favorites-pill"
            onClick={() => setShowGallery(true)}
            title="View your favorite emoticons"
          >
            <span className="pill-icon">⭐</span>
            <span className="pill-text">Favorites</span>
          </button>

          {user ? (
            <div className="hub-pill profile-pill">
              {getAvatarUrl() ? (
                <div className="profile-avatar">
                  <img src={getAvatarUrl()!} alt={`${getUserDisplayName()}'s avatar`} />
                </div>
              ) : (
                <div className="profile-avatar-fallback">
                  {getUserInitials()}
                </div>
              )}
              <span className="profile-name">{getUserDisplayName()}</span>
              <button className="signout-btn" onClick={handleSignOut} title="Sign out">
                Sign Out
              </button>
            </div>
          ) : (
            <button
              className="hub-pill signin-pill"
              onClick={() => setShowAuthModal(true)}
              disabled={loading && !loadingTimeout}
              title="Sign in to get credits"
            >
              <span className="pill-icon">🔐</span>
              <span className="pill-text">
                {(loading && !loadingTimeout) ? 'Loading...' : 'Sign In'}
              </span>
            </button>
          )}

          {showRetry && (
            <button className="hub-pill retry-pill" onClick={handleRetry} title="Retry loading">
              <span className="pill-icon">🔄</span>
              <span className="pill-text">Retry</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <Gallery isOpen={showGallery} onClose={() => setShowGallery(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </>
  )
}
