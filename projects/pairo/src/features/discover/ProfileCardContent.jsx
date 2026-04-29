import { useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, MapPin, Briefcase, Heart, ExternalLink, Bookmark } from 'lucide-react'
import ProjectDetail from './ProjectDetail'
import { C } from '../../constants'

export default function ProfileCardContent({ profile, photoIndex, onPhotoChange, scrollRef, isFront, onSave, isSaved }) {
  const photos = profile.photos || []
  const [openProject, setOpenProject] = useState(null)
  const [openProjectIndex, setOpenProjectIndex] = useState(0)

  const handleTap = (e) => {
    if (!isFront || photos.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const w = rect.width
    if (x < w * 0.3) onPhotoChange(Math.max(0, photoIndex - 1))
    else if (x > w * 0.7) onPhotoChange(Math.min(photos.length - 1, photoIndex + 1))
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', background: C.bg,
      border: `1px solid ${C.border}`,
    }}>
      <div ref={isFront ? scrollRef : null} style={{
        width: '100%', height: '100%', overflowY: isFront ? 'auto' : 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* ── BLOCK 1: Hero — project photos + user avatar top-left ── */}
        <div style={{ position: 'relative', width: '100%', height: '80%', minHeight: 420, flexShrink: 0 }}>
          <div onClick={handleTap} style={{
            position: 'absolute', inset: 0,
            backgroundImage: photos[photoIndex]?.startsWith('url(') ? photos[photoIndex] : 'none',
            backgroundColor: photos[photoIndex]?.startsWith('#') ? photos[photoIndex] : C.surface2,
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isFront ? 'pointer' : 'default', touchAction: 'none',
          }}>
            <span style={{ fontSize: 100, fontWeight: 700, color: 'rgba(255,255,255,.04)', userSelect: 'none' }}>
              {profile.name.split(' ').map(n => n[0]).join('')}
            </span>
            {/* Vignette overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(10,10,10,.25) 70%, rgba(10,10,10,.5) 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,.06) 0%, transparent 60%)',
            }} />
          </div>

          {/* User avatar — top-left */}
          <div style={{
            position: 'absolute', top: 14, left: 14, zIndex: 3,
            width: 46, height: 46, borderRadius: 16,
            overflow: 'hidden',
            border: `2px solid ${C.borderLight}`,
            boxShadow: `0 4px 16px rgba(0,0,0,.4)`,
            background: C.surface2,
          }}>
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: C.textTertiary,
              }}>{profile.name.split(' ').map(n => n[0]).join('')}</div>
            )}
          </div>

          {/* Photo dots */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 5, zIndex: 2,
          }}>
            {photos.map((_, i) => (
              <div key={i} style={{
                width: i === photoIndex ? 18 : 6, height: 6, borderRadius: 3,
                background: i === photoIndex ? C.orange : 'rgba(255,255,255,.3)',
                transition: 'all .3s cubic-bezier(.4,0,.2,1)',
              }} />
            ))}
          </div>

          {/* Gradient + name */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, zIndex: 1,
            background: `linear-gradient(to bottom,
              rgba(10,10,10,0) 0%,
              rgba(10,10,10,0.05) 20%,
              rgba(10,10,10,0.2) 40%,
              rgba(10,10,10,0.5) 60%,
              rgba(10,10,10,0.85) 80%,
              rgba(10,10,10,1) 100%)`,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 20px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: C.white, letterSpacing: '-0.03em' }}>{profile.name}</span>
              {profile.verified && <BadgeCheck size={18} color={C.orange} fill={C.orange} />}
            </div>
            <div style={{ fontSize: 13, fontWeight: 400, color: C.textSecondary }}>
              {[profile.role, profile.company].filter(Boolean).join(' · ')}
            </div>
            {profile.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <MapPin size={10} color={C.textTertiary} />
                <span style={{ fontSize: 11, color: C.textTertiary }}>{[profile.location, profile.distance].filter(Boolean).join(' · ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div style={{ background: C.bg, padding: '0 0 100px', touchAction: 'pan-y' }}>

          {/* ── Status chips ── */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '12px 20px 16px' }}>
            {[
              profile.availability && { label: profile.availability, accent: true },
              profile.type && { label: profile.type },
              profile.years && { label: `${profile.years}y exp` },
            ].filter(Boolean).map((chip, i) => (
              <div key={i} style={{
                padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                color: chip.accent ? C.white : C.textSecondary,
                background: chip.accent ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${chip.accent ? C.borderLight : C.border}`,
              }}>{chip.label}</div>
            ))}
          </div>

          {/* ── BLOCK 2: First prompt (editorial quote) ── */}
          {profile.prompts?.[0] && <div style={{ padding: '0 16px', marginBottom: 4 }}>
            <div style={{
              padding: '18px 18px 16px', borderRadius: 20,
              background: C.surface, border: `1px solid ${C.border}`,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Large quote mark */}
              <span style={{
                position: 'absolute', top: 8, left: 14, fontSize: 48, fontWeight: 700,
                color: C.white, opacity: 0.06, lineHeight: 1, pointerEvents: 'none',
              }}>"</span>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em',
                color: C.textSecondary, marginBottom: 10,
              }}>{profile.prompts?.[0]?.q || ''}</div>
              <div style={{
                fontSize: 15, fontWeight: 400, color: C.text, lineHeight: 1.6,
                letterSpacing: '-0.01em',
              }}>{profile.prompts?.[0]?.a || ''}</div>
            </div>
          </div>}

          {/* ── BLOCK 3: Tools & Skills ── */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: C.textTertiary, marginBottom: 10,
            }}>Tools & Skills</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {profile.skills.map((s, i) => (
                <div key={i} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  color: i === 0 ? C.bg : C.textSecondary,
                  background: i === 0 ? C.white : C.surface,
                  border: i === 0 ? 'none' : `1px solid ${C.border}`,
                }}>{s}</div>
              ))}
            </div>
          </div>

          {/* ── BLOCK 4: Location + context card ── */}
          <div style={{ padding: '4px 16px 8px' }}>
            <div style={{
              width: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative',
              background: C.surface,
              border: `1px solid ${C.border}`,
              padding: '20px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <MapPin size={13} color={C.white} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{profile.location}</span>
                  {profile.distance && <span style={{ fontSize: 11, color: C.textSecondary }}>· {profile.distance} away</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    padding: '6px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,.06)',
                    fontSize: 11, fontWeight: 500, color: C.white,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Briefcase size={11} color={C.textSecondary} />{profile.company || 'Freelance'}
                  </div>
                  {profile.years && <div style={{
                    padding: '6px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,.06)',
                    fontSize: 11, fontWeight: 500, color: C.white,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ fontSize: 11 }}>{profile.years}y experience</span>
                  </div>}
                </div>
              </div>
            </div>
          </div>

          {/* ── BLOCK 5: Second prompt ── */}
          {profile.prompts?.[1] && <div style={{ padding: '8px 16px 4px' }}>
            <div style={{
              padding: '18px 18px 16px', borderRadius: 20,
              background: C.surface,
              border: `1px solid ${C.border}`,
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{
                position: 'absolute', top: 8, left: 14, fontSize: 48, fontWeight: 700,
                color: C.white, opacity: 0.06, lineHeight: 1, pointerEvents: 'none',
              }}>"</span>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em',
                color: C.textSecondary, marginBottom: 10,
              }}>{profile.prompts?.[1]?.q || ''}</div>
              <div style={{
                fontSize: 15, fontWeight: 400, color: C.text, lineHeight: 1.6,
                letterSpacing: '-0.01em',
              }}>{profile.prompts?.[1]?.a || ''}</div>
            </div>
          </div>}

          {/* ── BLOCK 6: About ── */}
          {profile.bio && <div style={{ padding: '16px 20px 8px' }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: C.textTertiary, marginBottom: 10,
            }}>About</div>
            <p style={{
              fontSize: 14, fontWeight: 300, color: C.textSecondary, lineHeight: 1.7, margin: 0,
            }}>{profile.bio}</p>
          </div>}

          {/* ── BLOCK 7: Selected Work (tappable grid) ── */}
          {profile.work?.length > 0 && <div style={{ padding: '16px 16px 8px' }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: C.textTertiary, marginBottom: 12, paddingLeft: 4,
            }}>Selected Work</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {profile.work.map((w, i) => (
                <motion.button
                  key={i}
                  whileTap={isFront ? { scale: 0.95 } : {}}
                  onClick={(e) => { e.stopPropagation(); if (isFront) { setOpenProject(w); setOpenProjectIndex(i) } }}
                  style={{
                    aspectRatio: '1', borderRadius: 16, overflow: 'hidden', position: 'relative',
                    background: w.cover_url ? 'transparent' : (w.color || '#2D1B4E'),
                    border: 'none', cursor: isFront ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    padding: 0, textAlign: 'left',
                  }}
                >
                  {/* Cover image or initials watermark */}
                  {w.cover_url ? (
                    <img src={w.cover_url} alt="" style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover', pointerEvents: 'none',
                    }} />
                  ) : (
                    <span style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,.06)',
                      pointerEvents: 'none',
                    }}>{w.label.charAt(0)}</span>
                  )}

                  {/* Bottom info */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '24px 10px 9px',
                    background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, rgba(0,0,0,.15) 60%, transparent 100%)',
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.white, marginBottom: 2, letterSpacing: '-0.01em' }}>{w.label}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 400, color: 'rgba(255,255,255,.5)' }}>{[w.role, w.year].filter(Boolean).join(' · ')}</div>
                  </div>

                  {/* Expand indicator */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 22, height: 22, borderRadius: 7,
                    background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ExternalLink size={10} color="rgba(255,255,255,.6)" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>}

          {/* ── Card Footer: Connect CTA ── */}
          <div style={{
            padding: '16px 16px 12px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: '100%', padding: '20px', borderRadius: 20,
              background: C.surface,
              border: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: C.orange,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Heart size={18} color={C.white} />
                </div>
                <button onClick={(e) => { e.stopPropagation(); onSave && onSave() }} style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: isSaved ? C.orangeDim : C.surface,
                  border: `1px solid ${isSaved ? C.orangeBorder : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}>
                  <Bookmark size={18} color={isSaved ? C.orange : C.textTertiary} fill={isSaved ? C.orange : 'none'} />
                </button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, textAlign: 'center' }}>
                Interested in {profile.name.split(' ')[0]}?
              </div>
              <div style={{ fontSize: 11.5, color: C.textTertiary, textAlign: 'center', lineHeight: 1.5 }}>
                Swipe right or tap the heart below to connect
              </div>
            </div>

            {/* Subtle end marker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 12px' }}>
              <div style={{ width: 20, height: 1, background: C.border }} />
              <span style={{ fontSize: 9.5, fontWeight: 500, color: C.textTertiary, letterSpacing: '0.06em' }}>END</span>
              <div style={{ width: 20, height: 1, background: C.border }} />
            </div>
          </div>

        </div>
      </div>

      {/* Project detail overlay */}
      {openProject && (
        <ProjectDetail project={openProject} originIndex={openProjectIndex} onClose={() => setOpenProject(null)} />
      )}

    </div>
  )
}
