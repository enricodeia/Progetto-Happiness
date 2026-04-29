import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Globe, Layers, Sliders, Users } from 'lucide-react'
import InfiniteMenu from './InfiniteMenu'
import PixelCard from './PixelCard'
import MetaBalls from './MetaBalls'
import { supabase } from './supabase'
import { C } from './constants'
import PairoLogo from './components/PairoLogo'
import TabBar from './components/TabBar'
import SplashScreen from './features/splash/SplashScreen'
import WelcomeScreen, { ONBOARDING_SLIDES } from './features/onboarding/WelcomeScreen'
import SwipeableCard from './features/discover/SwipeableCard'
import MatchOverlay from './features/discover/MatchOverlay'
import ChatList from './features/chat/ChatList'
import ChatDetail from './features/chat/ChatDetail'
import useChatRealtime from './features/chat/useChatRealtime'
import ProfileScreen from './features/profile/ProfileScreen'
import ProPaywall from './features/profile/ProPaywall'

const FREE_DAILY_SWIPE_LIMIT = 25
const PAGE_SIZE = 20

export default function App() {
  const [appState, setAppState] = useState('splash') // 'splash' | 'welcome' | 'app'
  const [isOAuthReturn] = useState(() => window.location.hash.includes('access_token') || window.location.search.includes('code='))
  const [tab, setTab] = useState('discover')
  const [cardIndex, setCardIndex] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [matchProfile, setMatchProfile] = useState(null)
  const [activeChatId, setActiveChatId] = useState(null)
  const [discoverMode, setDiscoverMode] = useState('cards')
  const [realProfiles, setRealProfiles] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false)
  const [onboardingSlide, setOnboardingSlide] = useState(0)
  const [checkoutToast, setCheckoutToast] = useState(null) // 'success' | null
  const [isPro, setIsPro] = useState(false)
  const [dailySwipes, setDailySwipes] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [profileOffset, setProfileOffset] = useState(0)
  const [hasMoreProfiles, setHasMoreProfiles] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showGlassControls, setShowGlassControls] = useState(false)
  const [showBgControls, setShowBgControls] = useState(false)
  const [bgEffect, setBgEffect] = useState({
    type: 'pixelcard',
    gap: 6,
    speed: 30,
    colors: '#FF6B35,#FF8F5E,#FFB088,#CC5529,#993F1E',
    opacity: 0.25,
  })
  const [glass, setGlass] = useState({
    blur: 24,
    bgOpacity: 0.55,
    borderOpacity: 0.1,
    shadowSpread: 80,
    shadowOpacity: 0.5,
    tint: '#131313',
    noise: 0.03,
  })

  const glassStyle = {
    background: `${glass.tint}${Math.round(glass.bgOpacity * 255).toString(16).padStart(2, '0')}`,
    backdropFilter: `blur(${glass.blur}px)`,
    WebkitBackdropFilter: `blur(${glass.blur}px)`,
    border: `1px solid rgba(255,255,255,${glass.borderOpacity})`,
    boxShadow: `0 24px ${glass.shadowSpread}px rgba(0,0,0,${glass.shadowOpacity}), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,${glass.borderOpacity * 0.5})`,
  }

  const scrollRef = useRef(null)
  const lockRef = useRef(false)

  // Real-time chat
  const {
    conversations, activeMessages, loadConversations, loadMessages, sendMessage, markRead,
  } = useChatRealtime(currentUserId)

  const normalizeProfile = (p, projects = []) => {
    // Build photos array from real data
    const rawPhotos = p.photos || []
    const photoUrls = rawPhotos.map(url =>
      url.startsWith('url(') ? url : `url(${url})`
    )
    // Add profile photo as first if not already in the array
    if (p.photo_url && !rawPhotos.includes(p.photo_url)) {
      photoUrls.unshift(`url(${p.photo_url})`)
    }
    // Fallback to color placeholders if no photos at all
    const photos = photoUrls.length > 0
      ? photoUrls
      : ['#2D1B4E', '#1B3A4E', '#4E3B1B', '#1B4E3A']

    return {
      id: p.id,
      name: p.name || 'Anonymous',
      verified: p.is_pro || false,
      role: p.role || '',
      company: p.company || '',
      years: p.years_experience || null,
      location: p.location || '',
      distance: '',
      availability: p.availability || '',
      type: '',
      compatibility: null,
      photo_url: p.photo_url || null,
      photos,
      skills: p.skills || [],
      bio: p.bio || '',
      prompts: p.prompts || [],
      work: projects.map(proj => ({
        id: proj.id,
        label: proj.title,
        cover_url: proj.cover_url || null,
        visuals: proj.visuals || [],
        color: '#' + (proj.id || '2D1B4E').replace(/-/g, '').slice(0, 6),
        role: proj.role || '',
        year: proj.year || '',
        desc: proj.description || '',
      })),
      looking_for: p.looking_for || '',
    }
  }

  const scoreProfile = useCallback((profile, prefs) => {
    let score = 0
    // Role match: +3 per matching role
    if (prefs.pref_role_types?.length) {
      const roleMatches = prefs.pref_role_types.filter(r =>
        profile.role?.toLowerCase().includes(r.toLowerCase())
      )
      score += roleMatches.length * 3
    }
    // Industry match: +2 per matching industry (from skills overlap)
    if (prefs.pref_industries?.length) {
      const industryMatches = prefs.pref_industries.filter(ind =>
        (profile.skills || []).some(s => s.toLowerCase().includes(ind.toLowerCase()))
      )
      score += industryMatches.length * 2
    }
    // Location match: +5 if same city
    if (prefs.location && profile.location) {
      if (profile.location.toLowerCase().includes(prefs.location.toLowerCase()) ||
          prefs.location.toLowerCase().includes(profile.location.toLowerCase())) {
        score += 5
      }
    }
    // Has photos: +2
    if ((profile.photos || []).length > 0) score += 2
    // Has bio: +1
    if (profile.bio) score += 1
    // Has prompts with answers: +1
    if ((profile.prompts || []).some(p => p.a?.trim())) score += 1
    return score
  }, [])

  const loadProfiles = useCallback(async (userId) => {
    if (!userId) return
    setProfilesLoading(true)

    try {
      let swipedIds = []
      try {
        const { data: swipedRows } = await supabase
          .from('swipes')
          .select('swiped_id')
          .eq('swiper_id', userId)
        swipedIds = (swipedRows || []).map(r => r.swiped_id)
      } catch (e) {
        console.warn('Swipes table not available:', e)
      }

      const excludeIds = [userId, ...swipedIds]

      const { data: profiles, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('onboarding_complete', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('updated_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) console.warn('Load profiles error:', error)

      // Load user preferences for scoring
      let userPrefs = {}
      try {
        const { data: prefsData } = await supabase
          .from('profiles')
          .select('pref_role_types, pref_industries, location')
          .eq('id', userId)
          .maybeSingle()
        if (prefsData) userPrefs = prefsData
      } catch (e) {
        console.warn('Failed to load user preferences:', e)
      }

      // Load projects for discovered profiles
      const profileIds = (profiles || []).map(p => p.id)
      let projectsByUser = {}
      if (profileIds.length > 0) {
        try {
          const { data: allProjects } = await supabase
            .from('projects')
            .select('*')
            .in('user_id', profileIds)
            .order('sort_order', { ascending: true })
          if (allProjects) {
            allProjects.forEach(p => {
              if (!projectsByUser[p.user_id]) projectsByUser[p.user_id] = []
              projectsByUser[p.user_id].push(p)
            })
          }
        } catch (e) {
          console.warn('Projects table not available:', e)
        }
      }

      const normalized = (profiles || []).map(p => {
        const norm = normalizeProfile(p, projectsByUser[p.id] || [])
        const score = scoreProfile(p, userPrefs)
        return { ...norm, compatibility: score > 0 ? score : null }
      })

      // Sort by compatibility score descending
      normalized.sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0))

      setRealProfiles(normalized)
      setCardIndex(0)
      setProfileOffset(normalized.length)
      setHasMoreProfiles((profiles || []).length >= PAGE_SIZE)

      // Load saved/bookmarked profiles
      try {
        const { data: saves } = await supabase.from('saves').select('saved_id').eq('saver_id', userId)
        if (saves) setSavedIds(new Set(saves.map(s => s.saved_id)))
      } catch (e) {
        console.warn('Saves table not available:', e)
      }

      // Load today's swipe count for daily limit
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count } = await supabase
          .from('swipes')
          .select('*', { count: 'exact', head: true })
          .eq('swiper_id', userId)
          .gte('created_at', today.toISOString())
        if (count != null) setDailySwipes(count)
      } catch (e) {
        console.warn('Failed to load daily swipe count:', e)
      }
    } catch (e) {
      console.error('loadProfiles failed:', e)
    }
    setProfilesLoading(false)
  }, [scoreProfile])

  const loadMoreProfiles = useCallback(async () => {
    if (!currentUserId || loadingMore || !hasMoreProfiles) return
    setLoadingMore(true)

    try {
      let swipedIds = []
      try {
        const { data: swipedRows } = await supabase
          .from('swipes')
          .select('swiped_id')
          .eq('swiper_id', currentUserId)
        swipedIds = (swipedRows || []).map(r => r.swiped_id)
      } catch (e) {
        console.warn('Swipes table not available:', e)
      }

      const excludeIds = [currentUserId, ...swipedIds]

      const { data: profiles, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('onboarding_complete', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('updated_at', { ascending: false })
        .range(profileOffset, profileOffset + PAGE_SIZE - 1)

      if (error) console.warn('Load more profiles error:', error)

      // Load user preferences for scoring
      let userPrefs = {}
      try {
        const { data: prefsData } = await supabase
          .from('profiles')
          .select('pref_role_types, pref_industries, location')
          .eq('id', currentUserId)
          .maybeSingle()
        if (prefsData) userPrefs = prefsData
      } catch (e) {
        console.warn('Failed to load user preferences:', e)
      }

      // Load projects for new profiles
      const newProfileIds = (profiles || []).map(p => p.id)
      let moreProjectsByUser = {}
      if (newProfileIds.length > 0) {
        try {
          const { data: moreProjects } = await supabase
            .from('projects')
            .select('*')
            .in('user_id', newProfileIds)
            .order('sort_order', { ascending: true })
          if (moreProjects) {
            moreProjects.forEach(p => {
              if (!moreProjectsByUser[p.user_id]) moreProjectsByUser[p.user_id] = []
              moreProjectsByUser[p.user_id].push(p)
            })
          }
        } catch (e) {
          console.warn('Projects table not available:', e)
        }
      }

      const newProfiles = (profiles || []).map(p => {
        const norm = normalizeProfile(p, moreProjectsByUser[p.id] || [])
        const score = scoreProfile(p, userPrefs)
        return { ...norm, compatibility: score > 0 ? score : null }
      })

      // Sort new batch by score, then append
      newProfiles.sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0))

      if (newProfiles.length > 0) {
        setRealProfiles(prev => [...prev, ...newProfiles])
        setProfileOffset(prev => prev + newProfiles.length)
      }
      setHasMoreProfiles((profiles || []).length >= PAGE_SIZE)
    } catch (e) {
      console.error('loadMoreProfiles failed:', e)
    }
    setLoadingMore(false)
  }, [currentUserId, loadingMore, hasMoreProfiles, profileOffset, scoreProfile])

  useEffect(() => {
    let cancelled = false

    const handleSession = async (session) => {
      if (cancelled || !session) return
      setCurrentUserId(session.user.id)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete, is_pro')
          .eq('id', session.user.id)
          .maybeSingle()
        if (cancelled) return
        if (profile?.is_pro) setIsPro(true)
        if (profile?.onboarding_complete) {
          setAppState('app')
          loadProfiles(session.user.id)

          // Handle Stripe checkout return
          const params = new URLSearchParams(window.location.search)
          if (params.get('checkout') === 'success') {
            setCheckoutToast('success')
            setIsPro(true)
            window.history.replaceState({}, '', window.location.pathname)
            setTimeout(() => setCheckoutToast(null), 4000)
          } else if (params.get('checkout') === 'cancel') {
            window.history.replaceState({}, '', window.location.pathname)
          }
        } else {
          setAppState('welcome')
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('handleSession failed:', e)
      }
    }

    // Set up auth listener FIRST, then check existing session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        handleSession(session)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [loadProfiles])

  useEffect(() => {
    if (appState === 'app' && currentUserId) {
      loadProfiles(currentUserId)
      loadConversations()
    }
  }, [appState, currentUserId, loadProfiles, loadConversations])

  // Load messages when opening a chat
  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId)
      markRead(activeChatId)
    }
  }, [activeChatId, loadMessages, markRead])

  // Reload conversations when switching to chat tab
  useEffect(() => {
    if (tab === 'chat' && currentUserId) {
      loadConversations()
    }
  }, [tab, currentUserId, loadConversations])

  // Prefetch more profiles when nearing the end
  useEffect(() => {
    if (cardIndex >= realProfiles.length - 3 && hasMoreProfiles && !loadingMore && realProfiles.length > 0) {
      loadMoreProfiles()
    }
  }, [cardIndex, realProfiles.length, hasMoreProfiles, loadingMore, loadMoreProfiles])

  const handleSwipe = useCallback(async (direction) => {
    if (lockRef.current) return
    lockRef.current = true

    // Check daily swipe limit for free users
    if (!isPro && dailySwipes >= FREE_DAILY_SWIPE_LIMIT) {
      setShowPaywall(true)
      lockRef.current = false
      return
    }

    const profile = realProfiles[cardIndex]
    const liked = direction === 'right'

    if (profile && currentUserId) {
      try {
        await supabase.from('swipes').insert({
          swiper_id: currentUserId,
          swiped_id: profile.id,
          direction: liked ? 'like' : 'pass',
        })
      } catch (e) {
        console.warn('Swipes table not available:', e)
      }

      if (liked) {
        try {
          const { data: reciprocal } = await supabase
            .from('swipes')
            .select('id')
            .eq('swiper_id', profile.id)
            .eq('swiped_id', currentUserId)
            .eq('direction', 'like')
            .maybeSingle()
          if (reciprocal) {
            setMatchProfile(profile)
          }
        } catch (e) {
          console.warn('Match check failed:', e)
        }
      }
    }

    setCardIndex(prev => prev + 1)
    setPhotoIndex(0)
    setDailySwipes(prev => prev + 1)
    setTimeout(() => { lockRef.current = false }, 300)
  }, [cardIndex, realProfiles, currentUserId, isPro, dailySwipes])

  const handleSave = useCallback(async (profileId) => {
    if (!currentUserId) return
    const isSaved = savedIds.has(profileId)
    if (isSaved) {
      await supabase.from('saves').delete().eq('saver_id', currentUserId).eq('saved_id', profileId)
      setSavedIds(prev => { const next = new Set(prev); next.delete(profileId); return next })
    } else {
      await supabase.from('saves').insert({ saver_id: currentUserId, saved_id: profileId })
      setSavedIds(prev => new Set([...prev, profileId]))
    }
  }, [currentUserId, savedIds])

  const handleMatchMessage = () => {
    if (!matchProfile) return
    const matchId = [currentUserId, matchProfile.id].sort().join(':')
    setMatchProfile(null)
    setActiveChatId(matchId)
    setTab('chat')
    // Refresh conversations so the new match appears
    loadConversations()
  }

  const activeConversation = conversations.find(c => c.id === activeChatId)

  const globeItems = realProfiles.map(p => ({
    image: p.photo_url || p.photos[0],
    initials: p.name.split(' ').map(n => n[0]).join(''),
    title: p.name,
    description: `${p.role}${p.company ? ` at ${p.company}` : ''}`,
    profileId: p.id,
  }))

  const handleWelcomeDone = useCallback((isNewUser) => {
    setAppState('app')
    if (isNewUser) {
      setShowOnboardingPopup(true)
      setOnboardingSlide(0)
    }
  }, [])

  const handleGlobeSelect = (item) => {
    const profileIdx = realProfiles.findIndex(p => p.id === item.profileId)
    if (profileIdx !== -1) {
      setCardIndex(profileIdx)
      setPhotoIndex(0)
      setDiscoverMode('swipe')
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          30% { transform: translate(3%, -15%); }
          50% { transform: translate(12%, 9%); }
          70% { transform: translate(9%, 4%); }
          90% { transform: translate(-1%, 7%); }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 12px; height: 12px; border-radius: 50%;
          background: #FF6B35; cursor: pointer; border: 2px solid #1a1a1a;
        }
        input[type=range]::-moz-range-thumb {
          width: 12px; height: 12px; border-radius: 50%;
          background: #FF6B35; cursor: pointer; border: 2px solid #1a1a1a;
        }
        @media (max-width: 480px) {
          .app-column { border-radius: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          .welcome-popup { max-height: calc(100dvh - 24px) !important; }
        }
      `}</style>

      <div style={{
        width: '100%', height: '100dvh', overflow: 'hidden',
        background: C.bg, position: 'relative',
        fontFamily: "'Space Grotesk', sans-serif",
        userSelect: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Fullscreen background effect */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: C.surface,
            opacity: bgEffect.opacity,
          }}>
            {bgEffect.type === 'metaballs' ? (
              <MetaBalls
                color="#FF6B35"
                cursorBallColor="#FF6B35"
                cursorBallSize={0.5}
                ballCount={24}
                animationSize={15}
                enableMouseInteraction={false}
                enableTransparency={true}
                hoverSmoothness={0.46}
                clumpFactor={1.2}
                speed={0.1}
                asciiMode={true}
                asciiCharSize={8}
              />
            ) : (
              <PixelCard
                gap={bgEffect.gap}
                speed={bgEffect.speed}
                colors={bgEffect.colors}
              />
            )}
          </div>
        </div>

        {/* BG effect control panel */}
        {showBgControls && (
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 600,
            background: 'rgba(19,19,19,0.92)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '14px 16px',
            width: 220, pointerEvents: 'auto',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.orange }}>
                BG Effect
              </span>
              <button onClick={() => setShowBgControls(false)} style={{
                background: 'none', border: 'none', color: C.textTertiary, cursor: 'pointer', padding: 2,
              }}><X size={12} /></button>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {['pixelcard', 'metaballs'].map(t => (
                <button key={t} onClick={() => setBgEffect(prev => ({ ...prev, type: t }))} style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 500,
                  cursor: 'pointer', border: 'none',
                  background: bgEffect.type === t ? C.orange : 'rgba(255,255,255,0.06)',
                  color: bgEffect.type === t ? '#fff' : C.textSecondary,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>{t === 'pixelcard' ? 'PixelCard' : 'MetaBalls'}</button>
              ))}
            </div>

            {[
              { key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.05 },
              ...(bgEffect.type === 'pixelcard' ? [
                { key: 'gap', label: 'Gap', min: 2, max: 20, step: 1 },
                { key: 'speed', label: 'Speed', min: 5, max: 100, step: 5 },
              ] : []),
            ].map(({ key, label, min, max, step }) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'SF Mono, Menlo, monospace' }}>{bgEffect[key]}</span>
                </div>
                <input
                  type="range" min={min} max={max} step={step}
                  value={bgEffect[key]}
                  onChange={(e) => setBgEffect(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                  style={{ width: '100%', height: 3, accentColor: '#FF6B35', cursor: 'pointer' }}
                />
              </div>
            ))}

            {bgEffect.type === 'pixelcard' && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Colors</div>
                <input
                  type="text"
                  value={bgEffect.colors}
                  onChange={(e) => setBgEffect(prev => ({ ...prev, colors: e.target.value }))}
                  style={{
                    width: '100%', padding: '6px 8px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: C.text, fontSize: 10, fontFamily: 'SF Mono, Menlo, monospace',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* App column */}
        <div className="app-column" style={{
          display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
          width: '100%', maxWidth: 480, position: 'relative',
          margin: '24px 0',
          borderRadius: 20,
          overflow: 'hidden',
          ...glassStyle,
        }}>
          {/* Noise texture overlay */}
          {glass.noise > 0 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
              borderRadius: 'inherit',
              opacity: glass.noise,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px',
            }} />
          )}

          {tab === 'discover' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Brand header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px 8px', flexShrink: 0,
              }}>
                <PairoLogo size={22} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!isPro && (
                    <div style={{
                      padding: '3px 8px', borderRadius: 8,
                      background: dailySwipes >= FREE_DAILY_SWIPE_LIMIT - 5 ? C.red + '15' : 'rgba(255,255,255,.08)',
                      fontSize: 10, fontWeight: 600,
                      color: dailySwipes >= FREE_DAILY_SWIPE_LIMIT - 5 ? C.red : C.textSecondary,
                    }}>
                      {FREE_DAILY_SWIPE_LIMIT - dailySwipes} left
                    </div>
                  )}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    padding: 3, borderRadius: 10,
                    background: C.surface, border: `1px solid ${C.border}`,
                  }}>
                    {[
                      { id: 'cards', icon: <Layers size={13} />, label: 'Cards' },
                      { id: 'globe', icon: <Globe size={13} />, label: '3D' },
                    ].map(mode => {
                      const active = discoverMode === mode.id
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setDiscoverMode(mode.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            background: active ? C.orange : 'transparent',
                            color: active ? C.bg : C.textTertiary,
                            transition: 'all .2s ease',
                          }}
                        >
                          <span style={{ display: 'flex', color: 'inherit' }}>{mode.icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '-0.01em' }}>{mode.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {discoverMode === 'cards' ? (
                profilesLoading ? (
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${C.surface3}`, borderTopColor: C.orange, animation: 'spin 0.8s linear infinite' }} />
                    <div style={{ fontSize: 13, color: C.textTertiary }}>Loading profiles...</div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : realProfiles.length === 0 || cardIndex >= realProfiles.length ? (
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 40px',
                  }}>
                    {loadingMore ? (
                      <>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${C.surface3}`, borderTopColor: C.orange, animation: 'spin 0.8s linear infinite' }} />
                        <div style={{ fontSize: 13, color: C.textTertiary }}>Loading more profiles...</div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: 64, height: 64, borderRadius: 22, background: C.surface,
                          border: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
                        }}>
                          <Users size={26} color={C.textTertiary} />
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.white, textAlign: 'center', letterSpacing: '-0.02em' }}>
                          {realProfiles.length === 0 ? 'No one here yet' : "You've seen everyone"}
                        </div>
                        <div style={{ fontSize: 13, color: C.textTertiary, textAlign: 'center', lineHeight: 1.5 }}>
                          {realProfiles.length === 0
                            ? 'Be the first to join. Invite people you want to connect with.'
                            : 'Come back later for new profiles.'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          {realProfiles.length > 0 && (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => loadProfiles(currentUserId)}
                              style={{
                                padding: '10px 20px', borderRadius: 12,
                                background: C.orange,
                                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.white,
                              }}
                            >Refresh</motion.button>
                          )}
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setDiscoverMode('globe')}
                            style={{
                              padding: '10px 20px', borderRadius: 12,
                              background: C.surface, border: `1px solid ${C.border}`,
                              cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.textSecondary,
                            }}
                          >Try 3D mode</motion.button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                <div style={{ flex: 1, position: 'relative', margin: '0 12px 0', minHeight: 0 }}>
                  {realProfiles[cardIndex + 1] && (
                    <SwipeableCard
                      key={`bg-${cardIndex + 1}`}
                      profile={realProfiles[cardIndex + 1]}
                      photoIndex={0}
                      onPhotoChange={() => {}}
                      scrollRef={null}
                      onSwipe={() => {}}
                      isFront={false}
                    />
                  )}
                  {realProfiles[cardIndex] && (
                    <SwipeableCard
                      key={cardIndex}
                      profile={realProfiles[cardIndex]}
                      photoIndex={photoIndex}
                      onPhotoChange={setPhotoIndex}
                      scrollRef={scrollRef}
                      onSwipe={handleSwipe}
                      isFront={true}
                      onSave={() => handleSave(realProfiles[cardIndex].id)}
                      isSaved={savedIds.has(realProfiles[cardIndex].id)}
                    />
                  )}
                </div>
                )
              ) : (
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <InfiniteMenu items={globeItems} scale={1} onSelect={handleGlobeSelect} />
                </div>
              )}
            </div>
          )}

          {tab === 'chat' && (
            <>
              {!activeConversation && (
                <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
                  <PairoLogo size={22} />
                </div>
              )}
              {activeConversation
                ? <ChatDetail
                    conversation={activeConversation}
                    messages={activeMessages}
                    currentUserId={currentUserId}
                    onBack={() => setActiveChatId(null)}
                    onSend={(text) => sendMessage(activeChatId, activeConversation.matchedUserId, text)}
                  />
                : <ChatList chats={conversations} onOpen={setActiveChatId} />
              }
            </>
          )}

          {tab === 'profile' && (
            <>
              <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
                <PairoLogo size={22} />
              </div>
              <ProfileScreen userId={currentUserId} />
            </>
          )}

          <TabBar active={tab} onChange={(t) => { setTab(t); setActiveChatId(null) }} />
        </div>

        {/* Full-width overlays */}
        <AnimatePresence>
          {matchProfile && (
            <MatchOverlay
              profile={matchProfile}
              onMessage={handleMatchMessage}
              onKeepSwiping={() => setMatchProfile(null)}
            />
          )}
        </AnimatePresence>

        {/* Swipe limit paywall */}
        <AnimatePresence>
          {showPaywall && <ProPaywall onClose={() => setShowPaywall(false)} />}
        </AnimatePresence>

        {/* Stripe checkout success toast */}
        <AnimatePresence>
          {checkoutToast === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{
                position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
                zIndex: 600, padding: '14px 24px', borderRadius: 16,
                background: C.orange,
                boxShadow: '0 8px 32px rgba(255,107,53,.35)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: C.white }}>
                Pro activated! Welcome to Pairo Pro.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onboarding popup for new users */}
        <AnimatePresence>
          {showOnboardingPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 500,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
              }}
              onClick={() => setShowOnboardingPopup(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 380,
                  background: C.surface,
                  borderRadius: 24,
                  border: `1px solid ${C.border}`,
                  padding: '36px 28px 28px',
                  boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
              >
                <div style={{ alignSelf: 'flex-end', marginTop: -12, marginRight: -8, marginBottom: 8 }}>
                  <button onClick={() => setShowOnboardingPopup(false)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: C.textTertiary, fontWeight: 400,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>Skip</button>
                </div>

                <div style={{ width: '100%', minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={onboardingSlide}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}
                    >
                      <div style={{ width: 220, height: 180, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ONBOARDING_SLIDES[onboardingSlide].mockup}
                      </div>
                      <div style={{
                        fontSize: 22, fontWeight: 700, color: C.white,
                        letterSpacing: '-0.03em', marginBottom: 10, lineHeight: 1.2,
                      }}>{ONBOARDING_SLIDES[onboardingSlide].title}</div>
                      <div style={{
                        fontSize: 14, fontWeight: 300, color: C.textSecondary,
                        lineHeight: 1.7, maxWidth: 300,
                      }}>{ONBOARDING_SLIDES[onboardingSlide].body}</div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  {ONBOARDING_SLIDES.map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ width: i === onboardingSlide ? 20 : 6 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      style={{ height: 6, borderRadius: 3, background: i === onboardingSlide ? C.orange : C.surface3 }}
                    />
                  ))}
                </div>

                <motion.button
                  onClick={() => {
                    if (onboardingSlide < ONBOARDING_SLIDES.length - 1) {
                      setOnboardingSlide(s => s + 1)
                    } else {
                      setShowOnboardingPopup(false)
                    }
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 50, cursor: 'pointer',
                    background: C.orange, border: 'none',
                    color: C.white, fontSize: 15, fontWeight: 600,
                    letterSpacing: '-0.01em',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >{onboardingSlide === ONBOARDING_SLIDES.length - 1 ? 'Get started' : 'Next'}</motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'welcome' && (
            <WelcomeScreen onDone={handleWelcomeDone} glassStyle={glassStyle} startAtSetup={isOAuthReturn} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {appState === 'splash' && (
            <SplashScreen onDone={() => setAppState(prev => prev === 'splash' ? 'welcome' : prev)} />
          )}
        </AnimatePresence>

        {/* Glass Controls Toggle (hidden) */}
        <button
          onClick={() => setShowGlassControls(p => !p)}
          style={{ display: 'none' }}
        >
          <Sliders size={16} color={showGlassControls ? C.bg : C.textSecondary} />
        </button>

        {/* Glass Control Panel */}
        <AnimatePresence>
          {showGlassControls && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'fixed', bottom: 70, right: 20, zIndex: 9999,
                width: 280, padding: '16px 18px',
                background: 'rgba(20,20,20,.92)',
                backdropFilter: 'blur(24px)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,.1)',
                boxShadow: '0 16px 48px rgba(0,0,0,.6)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: C.white, marginBottom: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Glass Effect
              </div>

              {[
                { key: 'blur', label: 'Blur', min: 0, max: 60, step: 1, unit: 'px' },
                { key: 'bgOpacity', label: 'BG Opacity', min: 0, max: 1, step: 0.01 },
                { key: 'borderOpacity', label: 'Border', min: 0, max: 0.4, step: 0.01 },
                { key: 'shadowSpread', label: 'Shadow Spread', min: 0, max: 200, step: 1, unit: 'px' },
                { key: 'shadowOpacity', label: 'Shadow Opacity', min: 0, max: 1, step: 0.01 },
                { key: 'noise', label: 'Noise', min: 0, max: 0.15, step: 0.005 },
              ].map(({ key, label, min, max, step, unit }) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: C.textSecondary }}>{label}</span>
                    <span style={{ fontSize: 11, color: C.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                      {typeof glass[key] === 'number' && glass[key] % 1 !== 0 ? glass[key].toFixed(2) : glass[key]}{unit || ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={glass[key]}
                    onChange={e => setGlass(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    style={{
                      width: '100%', height: 3, appearance: 'none', WebkitAppearance: 'none',
                      background: `linear-gradient(to right, ${C.orange} ${((glass[key] - min) / (max - min)) * 100}%, rgba(255,255,255,.1) ${((glass[key] - min) / (max - min)) * 100}%)`,
                      borderRadius: 2, outline: 'none', cursor: 'pointer',
                    }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: C.textSecondary }}>Tint</span>
                  <span style={{ fontSize: 11, color: C.textTertiary }}>{glass.tint}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#131313', '#0a0a0a', '#1a1020', '#0a1520', '#1a0a0a'].map(c => (
                    <button
                      key={c}
                      onClick={() => setGlass(prev => ({ ...prev, tint: c }))}
                      style={{
                        width: 24, height: 24, borderRadius: 8, border: glass.tint === c ? `2px solid ${C.orange}` : '1px solid rgba(255,255,255,.1)',
                        background: c, cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => setGlass({ blur: 24, bgOpacity: 0.55, borderOpacity: 0.1, shadowSpread: 80, shadowOpacity: 0.5, tint: '#131313', noise: 0.03 })}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)',
                    background: 'transparent', color: C.textSecondary, fontSize: 11, cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >Reset</button>
                <button
                  onClick={() => {
                    const config = JSON.stringify(glass, null, 2)
                    navigator.clipboard.writeText(config)
                  }}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
                    background: C.orange, color: C.bg, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >Copy Config</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
