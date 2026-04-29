import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { X, Camera, Pencil, Plus, Trash2, Image as ImageIcon, ChevronLeft } from 'lucide-react'
import SubScreenHeader from '../../components/SubScreenHeader'
import { supabase } from '../../supabase'
import { C } from '../../constants'

export default function MyProfileScreen({ onBack, userId }) {
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(null) // field key being edited
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const [photoAction, setPhotoAction] = useState(null) // 'profile' | index number

  // Projects state
  const [projects, setProjects] = useState([])
  const [editingProjectId, setEditingProjectId] = useState(null) // project id or 'new'
  const [projectForm, setProjectForm] = useState({ title: '', role: '', year: '', description: '', cover_url: null, visuals: [] })
  const [projectSaving, setProjectSaving] = useState(false)
  const projectCoverRef = useRef(null)
  const projectVisualRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (data) setProfile(data)
    }
    load()
  }, [userId])

  // Load projects
  useEffect(() => {
    if (!userId) return
    const loadProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
      if (data) setProjects(data)
    }
    loadProjects()
  }, [userId])

  if (!profile) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: C.textTertiary, fontSize: 13 }}>Loading...</div></div>

  const name = profile.name || ''
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const photoUrl = profile.photo_url || null
  const photos = profile.photos || []
  const skills = profile.skills || []

  const startEdit = (key, value) => { setEditing(key); setEditValue(value || '') }

  const saveField = async (key, value) => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', userId)
    if (!error) setProfile(prev => ({ ...prev, [key]: value }))
    setSaving(false)
    setEditing(null)
  }

  const [uploadMsg, setUploadMsg] = useState(null) // { type: 'success' | 'error', text: string }

  const handlePhotoUpload = async (file, type) => {
    if (!file || photoUploading) return
    setPhotoUploading(true)
    setUploadMsg(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/${type === 'profile' ? 'profile' : 'projects'}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: true })
      if (uploadError) {
        setUploadMsg({ type: 'error', text: 'Upload failed. Try again.' })
        setPhotoUploading(false)
        setTimeout(() => setUploadMsg(null), 3000)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData.publicUrl

      if (type === 'profile') {
        await supabase.from('profiles').update({ photo_url: url }).eq('id', userId)
        setProfile(prev => ({ ...prev, photo_url: url }))
      } else {
        const newPhotos = [...photos, url]
        await supabase.from('profiles').update({ photos: newPhotos }).eq('id', userId)
        setProfile(prev => ({ ...prev, photos: newPhotos }))
      }
      setUploadMsg({ type: 'success', text: 'Photo saved!' })
      setTimeout(() => setUploadMsg(null), 2000)
    } catch (e) {
      setUploadMsg({ type: 'error', text: 'Something went wrong.' })
      setTimeout(() => setUploadMsg(null), 3000)
    }
    setPhotoUploading(false)
  }

  const removePhoto = async (index) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    await supabase.from('profiles').update({ photos: newPhotos }).eq('id', userId)
    setProfile(prev => ({ ...prev, photos: newPhotos }))
  }

  const removeSkill = async (skill) => {
    const newSkills = skills.filter(s => s !== skill)
    await supabase.from('profiles').update({ skills: newSkills }).eq('id', userId)
    setProfile(prev => ({ ...prev, skills: newSkills }))
  }

  // Project helpers
  const uploadFileToStorage = async (file, folder) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/projects/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: true })
    if (error) return null
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    return urlData.publicUrl
  }

  const startEditProject = (proj) => {
    setEditingProjectId(proj.id)
    setProjectForm({
      title: proj.title || '',
      role: proj.role || '',
      year: proj.year || '',
      description: proj.description || '',
      cover_url: proj.cover_url || null,
      visuals: proj.visuals || [],
    })
  }

  const startNewProject = () => {
    setEditingProjectId('new')
    setProjectForm({ title: '', role: '', year: '', description: '', cover_url: null, visuals: [] })
  }

  const saveProject = async () => {
    if (!projectForm.title.trim()) return
    setProjectSaving(true)

    try {
      if (editingProjectId === 'new') {
        const { data, error } = await supabase.from('projects').insert({
          user_id: userId,
          title: projectForm.title.trim(),
          role: projectForm.role || null,
          year: projectForm.year || null,
          description: projectForm.description || null,
          cover_url: projectForm.cover_url,
          visuals: projectForm.visuals.length > 0 ? projectForm.visuals : null,
          sort_order: projects.length,
        }).select().single()
        if (!error && data) setProjects(prev => [...prev, data])
      } else {
        const { data, error } = await supabase.from('projects').update({
          title: projectForm.title.trim(),
          role: projectForm.role || null,
          year: projectForm.year || null,
          description: projectForm.description || null,
          cover_url: projectForm.cover_url,
          visuals: projectForm.visuals.length > 0 ? projectForm.visuals : null,
        }).eq('id', editingProjectId).select().single()
        if (!error && data) setProjects(prev => prev.map(p => p.id === editingProjectId ? data : p))
      }
    } catch (e) {
      console.warn('Project save error:', e)
    }

    setProjectSaving(false)
    setEditingProjectId(null)
  }

  const deleteProject = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) setProjects(prev => prev.filter(p => p.id !== id))
  }

  const handleProjectCoverUpload = async (file) => {
    if (!file) return
    const url = await uploadFileToStorage(file, 'covers')
    if (url) setProjectForm(prev => ({ ...prev, cover_url: url }))
  }

  const handleProjectVisualUpload = async (file) => {
    if (!file || (projectForm.visuals || []).length >= 12) return
    const url = await uploadFileToStorage(file, 'visuals')
    if (url) setProjectForm(prev => ({ ...prev, visuals: [...(prev.visuals || []), url] }))
  }

  const removeProjectVisual = (index) => {
    setProjectForm(prev => ({
      ...prev,
      visuals: prev.visuals.filter((_, i) => i !== index),
    }))
  }

  const fields = [
    { label: 'Name', key: 'name', value: profile.name },
    { label: 'Role', key: 'role', value: profile.role },
    { label: 'Company', key: 'company', value: profile.company },
    { label: 'Location', key: 'location', value: profile.location },
  ]

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10, outline: 'none',
    background: C.surface2, color: C.white, fontSize: 13, fontWeight: 400,
    border: `1px solid ${C.surface3}`, fontFamily: "'Space Grotesk', sans-serif",
    boxSizing: 'border-box',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <SubScreenHeader title="My Profile" onBack={onBack} />

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0], 'profile'); e.target.value = '' }} />
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0], 'project'); e.target.value = '' }} />
      <input ref={projectCoverRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleProjectCoverUpload(e.target.files[0]); e.target.value = '' }} />
      <input ref={projectVisualRef} type="file" accept="image/*,video/*,.gif" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleProjectVisualUpload(e.target.files[0]); e.target.value = '' }} />

      {/* Upload feedback toast */}
      {uploadMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: 12, marginBottom: 12,
          background: uploadMsg.type === 'success' ? `${C.green}15` : `${C.red}15`,
          border: `1px solid ${uploadMsg.type === 'success' ? C.green : C.red}30`,
          fontSize: 12, fontWeight: 500, textAlign: 'center',
          color: uploadMsg.type === 'success' ? C.green : C.red,
        }}>{uploadMsg.text}</div>
      )}

      {/* Avatar + edit */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 20px' }}>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: 84, height: 84, borderRadius: 26, objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 84, height: 84, borderRadius: 26,
              background: C.surface3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: C.white,
            }}>{initials}</div>
          )}
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 28, height: 28, borderRadius: 10,
            background: C.surface2, border: `2px solid ${C.bg}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {photoUploading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid transparent', borderTopColor: C.orange }} />
            ) : (
              <Camera size={12} color={C.textSecondary} />
            )}
          </div>
        </div>
      </div>

      {/* Photos grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: C.textTertiary, marginBottom: 10,
        }}>Photos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {photos.map((url, i) => (
            <div key={i} style={{
              aspectRatio: '3/4', borderRadius: 14, background: C.surface2,
              position: 'relative', overflow: 'hidden',
            }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removePhoto(i)} style={{
                position: 'absolute', top: 6, right: 6,
                width: 22, height: 22, borderRadius: 7,
                background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={10} color="rgba(255,255,255,.7)" />
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <button onClick={() => photoInputRef.current?.click()} style={{
              aspectRatio: '3/4', borderRadius: 14, background: 'none',
              border: `1.5px dashed ${C.borderLight}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 22, color: C.textTertiary, fontWeight: 300 }}>+</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: C.textTertiary, marginBottom: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Projects</span>
          {!editingProjectId && (
            <button onClick={startNewProject} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
              color: C.white, fontSize: 11, fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              <Plus size={12} color={C.white} /> Add
            </button>
          )}
        </div>

        {/* Project edit form */}
        {editingProjectId && (
          <div style={{
            padding: 14, borderRadius: 14,
            background: C.surface, border: `1px solid ${C.border}`,
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => setEditingProjectId(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: C.textSecondary, fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 2,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                <ChevronLeft size={14} /> Cancel
              </button>
              <button onClick={saveProject} disabled={projectSaving || !projectForm.title.trim()} style={{
                background: C.orange, border: 'none', borderRadius: 8, padding: '6px 14px',
                color: C.white, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                opacity: (projectSaving || !projectForm.title.trim()) ? 0.5 : 1,
              }}>Save</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={projectForm.title}
                onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Project title"
                autoFocus
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={projectForm.role}
                  onChange={e => setProjectForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Your role"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  value={projectForm.year}
                  onChange={e => setProjectForm(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="Year"
                  style={{ ...inputStyle, width: 70, flexShrink: 0 }}
                />
              </div>
              <textarea
                value={projectForm.description}
                onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description..."
                rows={2}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              />

              {/* Cover */}
              <div>
                <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cover</div>
                <div
                  onClick={() => projectCoverRef.current?.click()}
                  style={{
                    width: '100%', aspectRatio: '16/9', borderRadius: 10,
                    border: projectForm.cover_url ? 'none' : `1.5px dashed ${C.borderLight}`,
                    background: projectForm.cover_url ? 'transparent' : C.surface2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  }}
                >
                  {projectForm.cover_url ? (
                    <>
                      <img src={projectForm.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                      <button onClick={(e) => { e.stopPropagation(); setProjectForm(prev => ({ ...prev, cover_url: null })) }} style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 22, height: 22, borderRadius: 7,
                        background: 'rgba(0,0,0,.5)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <X size={10} color="rgba(255,255,255,.7)" />
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <Camera size={18} color={C.textTertiary} />
                      <span style={{ fontSize: 11, color: C.textTertiary }}>Add cover</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Visuals */}
              <div>
                <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Visuals ({(projectForm.visuals || []).length}/12)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {(projectForm.visuals || []).map((url, vi) => (
                    <div key={vi} style={{
                      aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                      position: 'relative', background: C.surface2,
                    }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removeProjectVisual(vi)} style={{
                        position: 'absolute', top: 3, right: 3,
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'rgba(0,0,0,.6)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <X size={8} color="rgba(255,255,255,.7)" />
                      </button>
                    </div>
                  ))}
                  {(projectForm.visuals || []).length < 12 && (
                    <button onClick={() => projectVisualRef.current?.click()} style={{
                      aspectRatio: '1', borderRadius: 8, background: 'none',
                      border: `1.5px dashed ${C.borderLight}`, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Plus size={14} color={C.textTertiary} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project list */}
        {!editingProjectId && projects.length === 0 && (
          <div style={{
            padding: '20px', borderRadius: 14,
            background: C.surface, border: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: C.textTertiary, fontWeight: 300 }}>
              No projects yet. Add your first project.
            </div>
          </div>
        )}

        {!editingProjectId && projects.map(proj => (
          <div key={proj.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: 10,
            borderRadius: 12, background: C.surface,
            border: `1px solid ${C.border}`, marginBottom: 8,
          }}>
            {/* Cover thumbnail */}
            <div style={{
              width: 48, height: 48, borderRadius: 8, flexShrink: 0,
              background: proj.cover_url ? 'transparent' : C.surface3,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {proj.cover_url ? (
                <img src={proj.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageIcon size={16} color={C.textTertiary} />
              )}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => startEditProject(proj)}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 1 }}>
                {proj.title}
              </div>
              <div style={{ fontSize: 10, color: C.textTertiary }}>
                {(proj.visuals || []).length} visual{(proj.visuals || []).length !== 1 ? 's' : ''}
                {proj.role ? ` · ${proj.role}` : ''}
              </div>
            </div>
            {/* Edit */}
            <button onClick={() => startEditProject(proj)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
            }}>
              <Pencil size={12} color={C.textTertiary} />
            </button>
            {/* Delete */}
            <button onClick={() => deleteProject(proj.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
            }}>
              <Trash2 size={12} color={C.textTertiary} />
            </button>
          </div>
        ))}
      </div>

      {/* Info fields */}
      <div style={{
        background: C.surface, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${C.border}`, marginBottom: 16,
      }}>
        {fields.map((field, i, arr) => (
          <div key={field.key} style={{
            padding: '10px 14px',
            borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            {editing === field.key ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500, width: 60, flexShrink: 0 }}>{field.label}</span>
                <input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveField(field.key, editValue); if (e.key === 'Escape') setEditing(null) }}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8, outline: 'none',
                    background: C.surface2, color: C.white, fontSize: 14, fontWeight: 400,
                    border: `1px solid ${C.orange}`, fontFamily: "'Space Grotesk', sans-serif",
                  }}
                />
                <button onClick={() => saveField(field.key, editValue)} disabled={saving} style={{
                  background: C.orange, border: 'none', borderRadius: 8, padding: '6px 12px',
                  color: C.white, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif", opacity: saving ? 0.5 : 1,
                }}>Save</button>
              </div>
            ) : (
              <div onClick={() => startEdit(field.key, field.value)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500 }}>{field.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, color: field.value ? C.text : C.textTertiary }}>{field.value || 'Add...'}</span>
                  <Pencil size={11} color={C.textTertiary} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bio */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: C.textTertiary, marginBottom: 8,
        }}>Bio</div>
        {editing === 'bio' ? (
          <div>
            <textarea
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              autoFocus
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 14, outline: 'none',
                background: C.surface, color: C.white, fontSize: 13.5, fontWeight: 300,
                border: `1px solid ${C.orange}`, fontFamily: "'Space Grotesk', sans-serif",
                resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{
                background: 'none', border: `1px solid ${C.surface3}`, borderRadius: 8, padding: '6px 14px',
                color: C.textSecondary, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              }}>Cancel</button>
              <button onClick={() => saveField('bio', editValue)} disabled={saving} style={{
                background: C.orange, border: 'none', borderRadius: 8, padding: '6px 14px',
                color: C.white, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", opacity: saving ? 0.5 : 1,
              }}>Save</button>
            </div>
          </div>
        ) : (
          <div onClick={() => startEdit('bio', profile.bio)} style={{
            padding: '12px 14px', borderRadius: 14, background: C.surface,
            border: `1px solid ${C.border}`, fontSize: 13.5, color: profile.bio ? C.text : C.textTertiary,
            lineHeight: 1.6, fontWeight: 300, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <span>{profile.bio || 'Add a bio...'}</span>
            <Pencil size={11} color={C.textTertiary} style={{ flexShrink: 0, marginTop: 3 }} />
          </div>
        )}
      </div>

      {/* Skills */}
      <div>
        <div style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: C.textTertiary, marginBottom: 10,
        }}>Skills</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {skills.map((s, i) => (
            <div key={i} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              color: C.textSecondary, background: C.surface,
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {s}
              <button onClick={() => removeSkill(s)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center',
              }}>
                <X size={10} color={C.textTertiary} />
              </button>
            </div>
          ))}
          {editing === 'skill' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
                placeholder="Skill name"
                onKeyDown={async e => {
                  if (e.key === 'Enter' && editValue.trim()) {
                    const newSkills = [...skills, editValue.trim()]
                    await supabase.from('profiles').update({ skills: newSkills }).eq('id', userId)
                    setProfile(prev => ({ ...prev, skills: newSkills }))
                    setEditValue('')
                  }
                  if (e.key === 'Escape') { setEditing(null); setEditValue('') }
                }}
                style={{
                  padding: '7px 12px', borderRadius: 20, outline: 'none',
                  background: C.surface2, color: C.white, fontSize: 12,
                  border: `1px solid ${C.orange}`, fontFamily: "'Space Grotesk', sans-serif",
                  width: 120,
                }}
              />
            </div>
          ) : (
            <button onClick={() => { setEditing('skill'); setEditValue('') }} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              color: C.textTertiary, background: 'none',
              border: `1.5px dashed ${C.borderLight}`, cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>+ Add</button>
          )}
        </div>
      </div>
    </div>
  )
}
