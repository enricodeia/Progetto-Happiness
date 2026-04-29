import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, MapPin, Check, Camera, Pencil, Calendar, Image as ImageIcon, Plus, User, Briefcase, Building2, Sparkles, Target, Zap, MessageCircle, X, Trash2, FolderOpen } from 'lucide-react'
import { supabase } from '../../supabase'
import { C } from '../../constants'

const SETUP_SCREENS = [
  { icon: User, title: "What's your name?", subtitle: 'First name is required. Last name is optional and only visible to connections.', required: true },
  { icon: Calendar, title: "When's your birthday?", subtitle: 'Your age will be visible on your profile. Date of birth will not.', required: true },
  { icon: Briefcase, title: "What's your role?", subtitle: 'Type your role. Be specific.', required: true },
  { icon: Building2, title: 'Where do you work?', subtitle: 'This is optional. You can always add it later.', required: false },
  { icon: MapPin, title: 'Where are you based?', subtitle: 'Only your city will appear on your profile.', required: true },
  { icon: Sparkles, title: 'What are you great at?', subtitle: 'Pick the skills that define your work.', required: true },
  { icon: Target, title: 'What are you looking for?', subtitle: 'This helps us find the right people for you.', required: true },
  { icon: Zap, title: 'How available are you?', subtitle: 'Let others know your current status.', required: true },
  { icon: User, title: 'Add a profile picture.', subtitle: 'This is how people will recognize you. You can add it later.', required: false },
  { icon: Camera, title: 'Showcase your work.', subtitle: 'Add projects with a cover image and visuals. Min 3, max 12 visuals per project.', required: false },
  { icon: MessageCircle, title: 'Pick your prompts.', subtitle: 'Choose at least 3 prompts and write your answers.', required: true },
  { icon: Pencil, title: 'Tell us about yourself.', subtitle: 'A few words about you and your work. Optional.', required: false },
]

const TOTAL_SETUP_STEPS = SETUP_SCREENS.length

const ROLE_OPTIONS = [
  'Designer', 'Developer', 'Product Manager', 'Brand Strategist',
  'Creative Director', 'Copywriter', 'Illustrator', 'Photographer',
  'Motion Designer', '3D Artist', 'Data Analyst', 'Other',
]

const SKILL_OPTIONS = [
  'Product Design', 'Brand Identity', 'UI/UX', 'Design Systems',
  'TypeScript', 'React', 'Node.js', 'Python',
  'Illustration', 'Motion Design', '3D/WebGL', 'Photography',
  'Copywriting', 'Strategy', 'User Research', 'Data Analysis',
  'Art Direction', 'Figma', 'Prototyping', 'Creative Coding',
]

const LOOKING_FOR_OPTIONS = [
  'Co-founder', 'Collaborator', 'Mentor', 'Mentee',
  'Freelance partner', 'Full-time role', 'Side project buddy',
]

const AVAILABILITY_OPTIONS = [
  'Open to work', 'Exploring', 'Not looking', 'Freelancing',
]

const PROMPT_TABS = ['About me', 'My work', 'Goals']

const PROMPT_OPTIONS = {
  'About me': [
    'A random fact about me',
    'My simple pleasures',
    'My most irrational fear',
    "I'm known for",
    'My greatest strength',
    'A life goal of mine',
  ],
  'My work': [
    "A project I'm proud of",
    'My working style',
    'Best career advice I got',
    "Tools I can't live without",
    'What excites me right now',
    "A skill I'm building",
  ],
  'Goals': [
    "I'm looking for someone who",
    'My dream collaboration',
    'This year I want to',
    'The problem I want to solve',
    'What I bring to a team',
    'Where I see myself in 5 years',
  ],
}

const calculateAge = (dobStr) => {
  const day = parseInt(dobStr.slice(0, 2))
  const month = parseInt(dobStr.slice(2, 4)) - 1
  const year = parseInt(dobStr.slice(4, 8))
  const born = new Date(year, month, day)
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

const formatDobDate = (dobStr) => {
  const day = parseInt(dobStr.slice(0, 2))
  const month = parseInt(dobStr.slice(2, 4)) - 1
  const year = parseInt(dobStr.slice(4, 8))
  const date = new Date(year, month, day)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const isValidDob = (dobStr) => {
  if (dobStr.length !== 8) return false
  const day = parseInt(dobStr.slice(0, 2))
  const month = parseInt(dobStr.slice(2, 4))
  const year = parseInt(dobStr.slice(4, 8))
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  if (year < 1920 || year > 2010) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export default function ProfileSetup({ onDone, onBack, initialFirstName, initialLastName }) {
  const [setupStep, setSetupStep] = useState(0)
  const [profileFirstName, setProfileFirstName] = useState(initialFirstName || '')
  const [profileLastName, setProfileLastName] = useState(initialLastName || '')
  const [profileDob, setProfileDob] = useState('')
  const [profileRole, setProfileRole] = useState('')
  const [profileCompany, setProfileCompany] = useState('')
  const [profileLocation, setProfileLocation] = useState('')
  const [profileSkills, setProfileSkills] = useState([])
  const [profileLookingFor, setProfileLookingFor] = useState('')
  const [profileAvailability, setProfileAvailability] = useState('')
  const [profilePhotos, setProfilePhotos] = useState([null, null, null, null, null, null])
  const [profilePrompts, setProfilePrompts] = useState([])
  const [activePromptTab, setActivePromptTab] = useState(0)
  const [expandedPrompt, setExpandedPrompt] = useState(null)
  const [profileBio, setProfileBio] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [profileProjects, setProfileProjects] = useState([])
  const [editingProject, setEditingProject] = useState(null) // index or null
  const [validationError, setValidationError] = useState('')
  const [focusedField, setFocusedField] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const dobInputRef = useRef(null)

  const inputStyle = (field) => ({
    width: '100%', padding: '14px 18px', borderRadius: 14,
    background: C.surface2,
    border: `1.5px solid ${errors[field] ? C.red + '60' : focusedField === field ? C.orange : C.surface3}`,
    color: C.white, fontSize: 14, outline: 'none',
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400,
    transition: 'border-color 0.3s ease, background 0.3s ease',
  })

  const canAdvanceSetup = () => {
    switch (setupStep) {
      case 0: return profileFirstName.trim().length > 0
      case 1: return profileDob.length === 8 && isValidDob(profileDob)
      case 2: return profileRole.trim().length > 0
      case 3: return true // company is optional
      case 4: return profileLocation.trim().length > 0
      case 5: return profileSkills.length > 0
      case 6: return profileLookingFor !== ''
      case 7: return profileAvailability !== ''
      case 8: return true // profile picture is optional
      case 9: return true // project showcase is optional
      case 10: return profilePrompts.filter(p => p.a.trim().length > 0).length >= 3
      case 11: return true // bio is optional
      default: return false
    }
  }

  const getValidationMessage = () => {
    switch (setupStep) {
      case 0: return profileFirstName.trim().length === 0 ? 'Enter your first name' : ''
      case 1:
        if (profileDob.length < 8) return 'Enter your full date of birth'
        if (!isValidDob(profileDob)) return 'This date is not valid'
        return ''
      case 5: return profileSkills.length === 0 ? 'Select at least one skill' : ''
      case 10: return profilePrompts.filter(p => p.a.trim().length > 0).length < 3 ? 'Answer at least 3 prompts' : ''
      default: return 'Please fill in this field'
    }
  }

  const handleProfileNext = async () => {
    if (!canAdvanceSetup() && SETUP_SCREENS[setupStep].required) {
      setValidationError(getValidationMessage())
      return
    }

    setValidationError('')
    if (setupStep < TOTAL_SETUP_STEPS - 1) {
      setSetupStep(s => s + 1)
    } else {
      // Final step: save profile to Supabase
      setLoading(true)
      try {
        // Get current user, with fallback if lock is contested
        let user = null
        try {
          const { data } = await supabase.auth.getSession()
          user = data?.session?.user
        } catch (e) {
          // Lock may be contested — retry once after a short delay
          if (e.name === 'AbortError') {
            await new Promise(r => setTimeout(r, 500))
            try {
              const { data } = await supabase.auth.getSession()
              user = data?.session?.user
            } catch { /* exhausted retries */ }
          }
        }
        if (user) {
          // Helper to upload a base64 image
          const uploadImage = async (dataUrl, folder) => {
            if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl || null
            try {
              const res = await fetch(dataUrl)
              const blob = await res.blob()
              const ext = blob.type.split('/')[1] || 'jpg'
              const path = `${user.id}/${folder}/${Date.now()}.${ext}`
              const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, blob, { contentType: blob.type, upsert: true })
              if (!uploadError) {
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
                return urlData.publicUrl
              }
              console.warn('Upload failed (storage may not be configured):', uploadError.message)
            } catch (uploadErr) {
              console.warn('Upload skipped:', uploadErr)
            }
            return null
          }

          // Upload profile picture
          const profilePicUrl = await uploadImage(profilePicture, 'profile')

          // Upload project photos (legacy flat photos from profilePhotos state)
          const photoUrls = []
          for (const photo of profilePhotos) {
            if (!photo) continue
            const url = await uploadImage(photo, 'projects')
            if (url) photoUrls.push(url)
          }

          const fullName = [profileFirstName.trim(), profileLastName.trim()].filter(Boolean).join(' ')
          const profileData = {
            id: user.id,
            name: fullName,
            role: profileRole,
            bio: profileBio,
            company: profileCompany,
            location: profileLocation,
            skills: profileSkills,
            looking_for: profileLookingFor,
            availability: profileAvailability,
            date_of_birth: profileDob.length === 8 ? `${profileDob.slice(4, 8)}-${profileDob.slice(2, 4)}-${profileDob.slice(0, 2)}` : null,
            prompts: profilePrompts.filter(p => p.a.trim().length > 0),
            photo_url: profilePicUrl,
            photos: photoUrls.length > 0 ? photoUrls : null,
            onboarding_complete: true,
            updated_at: new Date().toISOString(),
          }
          const { error } = await supabase.from('profiles').upsert(profileData)
          if (error) {
            console.error('Profile save error:', error)
            setAuthError(`Failed to save profile: ${error.message}`)
            setLoading(false)
            return
          }

          // Upload project covers, visuals, and insert into projects table
          for (let pi = 0; pi < profileProjects.length; pi++) {
            const proj = profileProjects[pi]
            if (!proj.title?.trim()) continue // skip untitled projects

            // Upload cover
            let coverUrl = null
            if (proj.cover && proj.cover.startsWith('data:')) {
              const uploaded = await uploadImage(proj.cover, `projects/${pi}`)
              if (uploaded) coverUrl = uploaded
            }

            // Upload visuals
            const visualUrls = []
            for (let vi = 0; vi < (proj.visuals || []).length; vi++) {
              const v = proj.visuals[vi]
              if (v && v.startsWith('data:')) {
                const res = await fetch(v)
                const blob = await res.blob()
                const ext = blob.type.split('/')[1] || 'jpg'
                const path = `${user.id}/projects/${pi}/visual_${vi}.${ext}`
                const { error: upErr } = await supabase.storage
                  .from('avatars')
                  .upload(path, blob, { contentType: blob.type, upsert: true })
                if (!upErr) {
                  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
                  visualUrls.push(urlData.publicUrl)
                }
              } else if (v) {
                visualUrls.push(v) // already a URL
              }
            }

            // Insert into projects table
            const { error: projError } = await supabase.from('projects').insert({
              user_id: user.id,
              title: proj.title.trim(),
              role: proj.role || null,
              year: proj.year || null,
              description: proj.description || null,
              cover_url: coverUrl,
              visuals: visualUrls.length > 0 ? visualUrls : null,
              sort_order: pi,
            })
            if (projError) console.warn('Project insert error:', projError.message)
          }
        } else {
          setAuthError('Session expired. Please sign in again.')
          setLoading(false)
          return
        }
        setLoading(false)
        onDone(true) // Go to app + show onboarding popup
      } catch (err) {
        console.error('Profile save exception:', err)
        setAuthError('Something went wrong saving your profile.')
        setLoading(false)
      }
    }
  }

  const handleProfileBack = () => {
    if (setupStep > 0) {
      setValidationError('')
      setSetupStep(s => s - 1)
    }
  }

  const toggleSkill = (skill) => {
    setProfileSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
    setValidationError('')
  }

  // Pill selector helper
  const PillSelect = ({ options, value, onSelect, multi = false }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {options.map(opt => {
        const selected = multi ? value.includes(opt) : value === opt
        return (
          <motion.button
            key={opt}
            onClick={() => { onSelect(opt); setValidationError('') }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 20px', borderRadius: 50,
              border: `1.5px ${selected ? 'dashed' : 'solid'} ${selected ? C.orange : C.surface3}`,
              background: selected ? 'transparent' : C.surface2,
              color: selected ? C.text : C.textSecondary,
              fontSize: 14, fontWeight: selected ? 500 : 400, cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'border-color 0.2s, background 0.2s, color 0.2s',
            }}
          >
            {opt}
          </motion.button>
        )
      })}
    </div>
  )

  // Step content renderer
  const renderStepContent = () => {
    switch (setupStep) {
      // 0: Name
      case 0: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500, marginBottom: 8, letterSpacing: '0.04em' }}>FIRST NAME</div>
            <input
              value={profileFirstName}
              onChange={e => { setProfileFirstName(e.target.value); setValidationError('') }}
              onFocus={() => setFocusedField('firstName')}
              onBlur={() => setFocusedField(null)}
              placeholder="First name (required)"
              autoFocus
              style={inputStyle('firstName')}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500, marginBottom: 8, letterSpacing: '0.04em' }}>LAST NAME</div>
            <input
              value={profileLastName}
              onChange={e => setProfileLastName(e.target.value)}
              onFocus={() => setFocusedField('lastName')}
              onBlur={() => setFocusedField(null)}
              placeholder="Last name (optional)"
              style={inputStyle('lastName')}
            />
          </div>
        </div>
      )

      // 1: Date of Birth (segmented DD MM YYYY)
      case 1: {
        const dobSlots = ['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y']
        const groups = [[0, 1], [2, 3], [4, 5, 6, 7]]
        return (
          <div style={{ position: 'relative' }}>
            {/* Hidden input captures all keystrokes */}
            <input
              ref={dobInputRef}
              value={profileDob}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                setProfileDob(val)
                setValidationError('')
              }}
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              style={{
                position: 'absolute', opacity: 0, width: '100%', height: '100%',
                top: 0, left: 0, zIndex: 2, cursor: 'text',
              }}
            />
            {/* Visual slots */}
            <div
              onClick={() => dobInputRef.current?.focus()}
              style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'text', flexWrap: 'nowrap' }}
            >
              {groups.map((group, gi) => {
                return (
                <div key={gi} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {gi > 0 && <span style={{ fontSize: 16, color: C.textTertiary, fontWeight: 300, margin: '0 1px' }}>/</span>}
                  {group.map(i => {
                    const filled = profileDob.length > i
                    const isActive = profileDob.length === i
                    return (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (filled) {
                            // Tap on a filled slot: trim back to that position so user can re-type from there
                            setProfileDob(profileDob.slice(0, i))
                          }
                          dobInputRef.current?.focus()
                        }}
                        style={{
                        width: 32, height: 44, borderRadius: 10,
                        background: C.surface2,
                        border: `1.5px solid ${isActive ? C.orange : filled ? C.borderLight : C.surface3}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 600,
                        color: filled ? C.white : C.textTertiary,
                        transition: 'border-color 0.2s',
                        cursor: filled ? 'pointer' : 'text',
                      }}>
                        {filled ? profileDob[i] : dobSlots[i]}
                      </div>
                    )
                  })}
                </div>
                )
              })}
            </div>
            {profileDob.length === 8 && !isValidDob(profileDob) && (
              <div style={{ fontSize: 12, color: C.red, marginTop: 12, fontWeight: 400 }}>
                Please enter a valid date.
              </div>
            )}
            {profileDob.length === 8 && isValidDob(profileDob) && (
              <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 14, fontWeight: 400 }}>
                {formatDobDate(profileDob)} — {calculateAge(profileDob)} years old
              </div>
            )}
          </div>
        )
      }

      // 2: Role
      case 2: return (
        <div>
          <input
            value={profileRole}
            onChange={e => { setProfileRole(e.target.value); setValidationError('') }}
            placeholder="e.g. Creative Director, Full-Stack Developer"
            onFocus={() => setFocusedField('role')}
            onBlur={() => setFocusedField(null)}
            autoFocus
            style={inputStyle('role')}
          />
          {ROLE_OPTIONS.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
              {ROLE_OPTIONS.map(r => (
                <button key={r} onClick={() => { setProfileRole(r); setValidationError('') }} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                  background: profileRole === r ? C.orangeDim : 'transparent',
                  border: `1px solid ${profileRole === r ? C.orangeBorder : C.surface3}`,
                  color: profileRole === r ? C.orange : C.textTertiary,
                  cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                }}>{r}</button>
              ))}
            </div>
          )}
        </div>
      )

      // 3: Company (optional)
      case 3: return (
        <input
          value={profileCompany}
          onChange={e => setProfileCompany(e.target.value)}
          onFocus={() => setFocusedField('company')}
          onBlur={() => setFocusedField(null)}
          placeholder="Company, Studio, Freelancer..."
          autoFocus
          style={inputStyle('company')}
        />
      )

      // 4: Location
      case 4: {
        const CITY_SUGGESTIONS = [
          'Barcelona, Spain', 'Berlin, Germany', 'London, UK', 'Milan, Italy',
          'Amsterdam, Netherlands', 'Paris, France', 'New York, USA', 'San Francisco, USA',
          'Copenhagen, Denmark', 'Stockholm, Sweden', 'Tokyo, Japan', 'Seoul, South Korea',
          'Lisbon, Portugal', 'Dubai, UAE', 'Singapore', 'Sydney, Australia',
          'Toronto, Canada', 'Los Angeles, USA', 'Helsinki, Finland', 'Rome, Italy',
          'Munich, Germany', 'Zurich, Switzerland', 'Mexico City, Mexico', 'Lagos, Nigeria',
          'Sassari, Italy', 'Cagliari, Italy', 'Turin, Italy', 'Florence, Italy', 'Bologna, Italy',
        ]
        const filtered = profileLocation.trim().length > 0
          ? CITY_SUGGESTIONS.filter(c => c.toLowerCase().includes(profileLocation.toLowerCase()))
          : []
        const showSuggestions = focusedField === 'location' && filtered.length > 0 && !CITY_SUGGESTIONS.includes(profileLocation)
        return (
          <div style={{ position: 'relative' }}>
            <input
              value={profileLocation}
              onChange={e => { setProfileLocation(e.target.value); setValidationError('') }}
              onFocus={() => setFocusedField('location')}
              onBlur={() => setTimeout(() => setFocusedField(null), 150)}
              placeholder="e.g. Milan, London, New York"
              autoFocus
              style={inputStyle('location')}
            />
            {showSuggestions && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                background: C.surface2, border: `1px solid ${C.borderLight}`, borderRadius: 14,
                overflow: 'hidden', zIndex: 10, maxHeight: 200, overflowY: 'auto',
              }}>
                {filtered.slice(0, 6).map(city => (
                  <button
                    key={city}
                    onMouseDown={e => { e.preventDefault(); setProfileLocation(city) }}
                    style={{
                      width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                      borderBottom: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left',
                      color: C.text, fontSize: 14, fontWeight: 400,
                      fontFamily: "'Space Grotesk', sans-serif",
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <MapPin size={14} color={C.textTertiary} />
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      }

      // 5: Skills
      case 5: return (
        <div>
          <PillSelect options={SKILL_OPTIONS} value={profileSkills} onSelect={toggleSkill} multi />
          <div style={{
            fontSize: 13, color: C.textTertiary, marginTop: 16, fontWeight: 300,
          }}>{profileSkills.length} selected</div>
        </div>
      )

      // 6: Looking for
      case 6: return (
        <PillSelect options={LOOKING_FOR_OPTIONS} value={profileLookingFor} onSelect={setProfileLookingFor} />
      )

      // 7: Availability
      case 7: return (
        <PillSelect options={AVAILABILITY_OPTIONS} value={profileAvailability} onSelect={setProfileAvailability} />
      )

      // 8: Profile Picture
      case 8: return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => setProfilePicture(ev.target.result)
                reader.readAsDataURL(file)
              }
              input.click()
            }}
            style={{
              width: 140, height: 140, borderRadius: '50%',
              border: profilePicture ? 'none' : `2px dashed ${C.surface3}`,
              background: profilePicture ? 'transparent' : C.surface2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}
          >
            {profilePicture ? (
              <>
                <img src={profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                <button onClick={(e) => { e.stopPropagation(); setProfilePicture(null) }} style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', border: 'none',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={12} color={C.white} />
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Camera size={28} color={C.textTertiary} strokeWidth={1.5} />
                <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 400 }}>Tap to upload</div>
              </div>
            )}
          </motion.div>
          <div style={{ fontSize: 13, color: C.textTertiary, fontWeight: 300, textAlign: 'center' }}>
            {profilePicture ? 'Looking good.' : 'You can always add this later.'}
          </div>
        </div>
      )

      // 9: Project Showcase (project builder)
      case 9: {
        const pickFile = (accept = 'image/*') => new Promise((resolve) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = accept
          input.onchange = (e) => {
            const file = e.target.files?.[0]
            if (!file) { resolve(null); return }
            const reader = new FileReader()
            reader.onload = (ev) => resolve(ev.target.result)
            reader.readAsDataURL(file)
          }
          input.click()
        })

        const updateProject = (index, field, value) => {
          setProfileProjects(prev => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
          })
        }

        // Editing a project
        if (editingProject !== null) {
          const proj = profileProjects[editingProject] || {}
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Back to list */}
              <button onClick={() => setEditingProject(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: C.textSecondary, fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4,
              }}>
                <ChevronLeft size={14} /> All projects
              </button>

              {/* Title */}
              <input
                value={proj.title || ''}
                onChange={e => updateProject(editingProject, 'title', e.target.value)}
                placeholder="Project title"
                autoFocus
                style={inputStyle('projTitle')}
                onFocus={() => setFocusedField('projTitle')}
                onBlur={() => setFocusedField(null)}
              />

              {/* Role + Year row */}
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={proj.role || ''}
                  onChange={e => updateProject(editingProject, 'role', e.target.value)}
                  placeholder="Your role"
                  style={{ ...inputStyle('projRole'), flex: 1 }}
                  onFocus={() => setFocusedField('projRole')}
                  onBlur={() => setFocusedField(null)}
                />
                <input
                  value={proj.year || ''}
                  onChange={e => updateProject(editingProject, 'year', e.target.value)}
                  placeholder="Year"
                  style={{ ...inputStyle('projYear'), width: 80, flexShrink: 0 }}
                  onFocus={() => setFocusedField('projYear')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>

              {/* Description */}
              <textarea
                value={proj.description || ''}
                onChange={e => updateProject(editingProject, 'description', e.target.value)}
                placeholder="Brief description..."
                rows={2}
                style={{ ...inputStyle('projDesc'), resize: 'none', lineHeight: 1.6 }}
                onFocus={() => setFocusedField('projDesc')}
                onBlur={() => setFocusedField(null)}
              />

              {/* Cover image */}
              <div>
                <div style={{
                  fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                  color: C.textTertiary, marginBottom: 8,
                }}>Cover image</div>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const data = await pickFile('image/*')
                    if (data) updateProject(editingProject, 'cover', data)
                  }}
                  style={{
                    width: '100%', aspectRatio: '16/9', borderRadius: 14,
                    border: proj.cover ? 'none' : `2px dashed ${C.surface3}`,
                    background: proj.cover ? 'transparent' : C.surface2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  }}
                >
                  {proj.cover ? (
                    <>
                      <img src={proj.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                      <button onClick={(e) => { e.stopPropagation(); updateProject(editingProject, 'cover', null) }} style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <X size={12} color={C.white} />
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Camera size={24} color={C.textTertiary} strokeWidth={1.5} />
                      <span style={{ fontSize: 12, color: C.textTertiary }}>Add cover</span>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Visuals grid (3x4 = 12 slots) */}
              <div>
                <div style={{
                  fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                  color: C.textTertiary, marginBottom: 8,
                }}>Visuals ({(proj.visuals || []).length}/12, min 3)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Array.from({ length: 12 }).map((_, vi) => {
                    const visual = (proj.visuals || [])[vi]
                    return (
                      <motion.div
                        key={vi}
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          if (visual) return
                          const data = await pickFile('image/*,video/*,.gif')
                          if (data) {
                            const visuals = [...(proj.visuals || [])]
                            visuals.push(data)
                            updateProject(editingProject, 'visuals', visuals)
                          }
                        }}
                        style={{
                          aspectRatio: '1', borderRadius: 10,
                          border: visual ? 'none' : `1.5px dashed ${C.surface3}`,
                          background: visual ? 'transparent' : C.surface2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: visual ? 'default' : 'pointer',
                          position: 'relative', overflow: 'hidden',
                        }}
                      >
                        {visual ? (
                          <>
                            <img src={visual} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                            <button onClick={(e) => {
                              e.stopPropagation()
                              const visuals = [...(proj.visuals || [])]
                              visuals.splice(vi, 1)
                              updateProject(editingProject, 'visuals', visuals)
                            }} style={{
                              position: 'absolute', top: 4, right: 4,
                              width: 18, height: 18, borderRadius: '50%',
                              background: 'rgba(0,0,0,0.6)', border: 'none',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <X size={9} color={C.white} />
                            </button>
                          </>
                        ) : (
                          <Plus size={14} color={C.textTertiary} strokeWidth={1.5} />
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        }

        // Project list view
        return (
          <div>
            {profileProjects.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: C.surface2, border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FolderOpen size={28} color={C.textTertiary} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 14, color: C.textTertiary, fontWeight: 300, textAlign: 'center' }}>
                  No projects yet. Add your first project to showcase your work.
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setProfileProjects(prev => [...prev, { title: '', role: '', year: '', description: '', cover: null, visuals: [] }])
                    setEditingProject(profileProjects.length)
                  }}
                  style={{
                    padding: '12px 24px', borderRadius: 14,
                    background: C.orange, border: 'none',
                    color: C.white, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Plus size={16} color={C.white} strokeWidth={2} /> Add project
                </motion.button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profileProjects.map((proj, i) => (
                  <motion.div
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setEditingProject(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                      borderRadius: 14, background: C.surface2,
                      border: `1px solid ${C.border}`, cursor: 'pointer',
                    }}
                  >
                    {/* Cover thumbnail */}
                    <div style={{
                      width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                      background: proj.cover ? 'transparent' : C.surface3,
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {proj.cover ? (
                        <img src={proj.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={20} color={C.textTertiary} strokeWidth={1.5} />
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: proj.title ? C.white : C.textTertiary, marginBottom: 2 }}>
                        {proj.title || 'Untitled project'}
                      </div>
                      <div style={{ fontSize: 11, color: C.textTertiary }}>
                        {(proj.visuals || []).length} visual{(proj.visuals || []).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {/* Delete */}
                    <button onClick={(e) => {
                      e.stopPropagation()
                      setProfileProjects(prev => prev.filter((_, idx) => idx !== i))
                    }} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Trash2 size={14} color={C.textTertiary} />
                    </button>
                  </motion.div>
                ))}
                {/* Add project button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setProfileProjects(prev => [...prev, { title: '', role: '', year: '', description: '', cover: null, visuals: [] }])
                    setEditingProject(profileProjects.length)
                  }}
                  style={{
                    padding: '14px', borderRadius: 14,
                    background: 'none', border: `1.5px dashed ${C.borderLight}`,
                    color: C.textTertiary, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Plus size={16} color={C.textTertiary} strokeWidth={1.5} /> Add project
                </motion.button>
              </div>
            )}
            <div style={{ fontSize: 13, color: C.textTertiary, marginTop: 16, fontWeight: 300 }}>
              {profileProjects.length > 0
                ? `${profileProjects.length} project${profileProjects.length > 1 ? 's' : ''} added`
                : 'You can add projects later from your profile.'}
            </div>
          </div>
        )
      }

      // 10: Prompts
      case 10: {
        const answeredCount = profilePrompts.filter(p => p.a.trim().length > 0).length
        return (
          <div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `1px solid ${C.surface3}` }}>
              {PROMPT_TABS.map((tab, i) => (
                <motion.button
                  key={tab}
                  onClick={() => { setActivePromptTab(i); setExpandedPrompt(null) }}
                  style={{
                    flex: 1, padding: '12px 0', background: 'none', border: 'none',
                    borderBottom: `2px solid ${i === activePromptTab ? C.orange : 'transparent'}`,
                    color: i === activePromptTab ? C.white : C.textTertiary,
                    fontSize: 13, fontWeight: i === activePromptTab ? 600 : 400,
                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    transition: 'color 0.2s, border-color 0.2s',
                    marginBottom: -1,
                  }}
                >{tab}</motion.button>
              ))}
            </div>

            {/* Prompt list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROMPT_OPTIONS[PROMPT_TABS[activePromptTab]].map(prompt => {
                const existing = profilePrompts.find(p => p.q === prompt)
                const hasAnswer = existing && existing.a.trim().length > 0
                const isExpanded = expandedPrompt === prompt
                return (
                  <div key={prompt}>
                    <motion.button
                      onClick={() => setExpandedPrompt(isExpanded ? null : prompt)}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '14px 18px',
                        borderRadius: 14, cursor: 'pointer',
                        background: hasAnswer ? C.orangeDim : C.surface2,
                        border: `1.5px solid ${hasAnswer ? C.orangeBorder : isExpanded ? C.orange : C.surface3}`,
                        color: hasAnswer ? C.orange : C.textSecondary,
                        fontSize: 14, fontWeight: hasAnswer ? 600 : 400,
                        fontFamily: "'Space Grotesk', sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                    >
                      <span>{prompt}</span>
                      {hasAnswer && <Check size={14} color={C.orange} strokeWidth={2.5} />}
                    </motion.button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <textarea
                            autoFocus
                            value={existing?.a || ''}
                            onChange={e => {
                              const val = e.target.value
                              setProfilePrompts(prev => {
                                const idx = prev.findIndex(p => p.q === prompt)
                                if (idx >= 0) {
                                  const next = [...prev]
                                  next[idx] = { q: prompt, a: val }
                                  return next
                                }
                                return [...prev, { q: prompt, a: val }]
                              })
                              setValidationError('')
                            }}
                            onBlur={() => {
                              // Remove empty prompts on blur
                              setProfilePrompts(prev => prev.filter(p => p.a.trim().length > 0))
                            }}
                            placeholder="Write your answer..."
                            rows={3}
                            style={{
                              ...inputStyle('prompt'),
                              marginTop: 8, resize: 'none', lineHeight: 1.7,
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 13, color: answeredCount >= 3 ? C.green : C.textTertiary, marginTop: 16, fontWeight: 300 }}>
              {answeredCount} of 3 prompts answered
            </div>
          </div>
        )
      }

      // 11: Bio (optional)
      case 11: return (
        <textarea
          value={profileBio}
          onChange={e => setProfileBio(e.target.value)}
          onFocus={() => setFocusedField('bio')}
          onBlur={() => setFocusedField(null)}
          placeholder="A few words about you and your work..."
          rows={4}
          autoFocus
          style={{
            ...inputStyle('bio'),
            resize: 'none', lineHeight: 1.7,
          }}
        />
      )
      default: return null
    }
  }

  const screen = SETUP_SCREENS[setupStep]
  const IconComponent = screen.icon
  const ready = canAdvanceSetup()
  const isLastStep = setupStep === TOTAL_SETUP_STEPS - 1
  const isOptional = !screen.required

  return (
    <motion.div
      key="profile-setup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: 0,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden auto', padding: '48px 36px 40px' }}>
        {/* Back button */}
        {setupStep > 0 && (
          <motion.button
            onClick={handleProfileBack}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.textSecondary, fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4,
              marginBottom: 24, padding: 0,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <ChevronLeft size={16} /> Back
          </motion.button>
        )}

        {/* Icon + progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: `1.5px solid ${C.borderLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IconComponent size={20} color={C.white} strokeWidth={1.5} />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {SETUP_SCREENS.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === setupStep ? 8 : 5,
                  height: i === setupStep ? 8 : 5,
                  opacity: i <= setupStep ? 1 : 0.3,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                  borderRadius: '50%',
                  background: i <= setupStep ? C.orange : C.surface3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Title + subtitle */}
        <AnimatePresence mode="wait">
          <motion.div
            key={setupStep}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{
              fontSize: 30, fontWeight: 700, color: C.white,
              letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: 10,
            }}>{screen.title}</div>
            <div style={{
              fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 300, lineHeight: 1.6, marginBottom: 36,
            }}>{screen.subtitle}</div>
          </motion.div>
        </AnimatePresence>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={setupStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Validation error */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            style={{
              padding: '0 36px', flexShrink: 0,
              fontSize: 13, fontWeight: 500, color: C.red,
              textAlign: isOptional ? 'left' : 'right',
            }}
          >
            {validationError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth error */}
      {authError && (
        <div style={{
          padding: '8px 36px', flexShrink: 0,
          fontSize: 13, fontWeight: 500, color: C.red,
        }}>
          {authError}
        </div>
      )}

      {/* Bottom: skip (optional) + forward arrow */}
      <div style={{
        padding: '16px 36px 28px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: isOptional ? 'space-between' : 'flex-end',
      }}>
        {isOptional && (
          <motion.button
            onClick={handleProfileNext}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.textTertiary, fontSize: 14, fontWeight: 500,
              fontFamily: "'Space Grotesk', sans-serif", padding: '8px 0',
            }}
          >Skip</motion.button>
        )}
        <motion.button
          onClick={handleProfileNext}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          disabled={loading || (!ready && screen.required)}
          animate={{
            background: (ready || !screen.required) ? C.orange : C.surface3,
            opacity: loading ? 0.5 : 1,
          }}
          transition={{ duration: 0.25 }}
          style={{
            width: isLastStep ? 'auto' : 52, height: 52,
            borderRadius: isLastStep ? 50 : '50%',
            border: 'none', cursor: (ready || !screen.required) ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: isLastStep ? '0 28px' : 0,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15, fontWeight: 600, color: C.white,
          }}
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              style={{ width: 20, height: 20, border: `2px solid ${C.white}40`, borderTopColor: C.white, borderRadius: '50%' }}
            />
          ) : isLastStep ? (
            <>Get started</>
          ) : (
            <ChevronRight size={22} color={C.white} strokeWidth={2} />
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
