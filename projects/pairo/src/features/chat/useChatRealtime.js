import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../supabase'

function makeMatchId(a, b) {
  return [a, b].sort().join(':')
}

export default function useChatRealtime(currentUserId) {
  const [conversations, setConversations] = useState([])
  const [activeMessages, setActiveMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef(null)

  // Load matches and build conversation list
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return
    setLoading(true)

    try {
      // Get matches via secure function
      const { data: matches, error: matchError } = await supabase.rpc('get_my_matches')
      if (matchError) {
        console.warn('get_my_matches failed:', matchError)
        setLoading(false)
        return
      }

      if (!matches || matches.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Fetch matched user profiles
      const matchedUserIds = matches.map(m => m.matched_user_id)
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, name, photo_url, role')
        .in('id', matchedUserIds)

      const profileMap = {}
      ;(profiles || []).forEach(p => { profileMap[p.id] = p })

      // Build match_ids and fetch latest message per conversation
      const matchIds = matches.map(m => makeMatchId(currentUserId, m.matched_user_id))

      const { data: latestMessages } = await supabase
        .from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })

      // Group by match_id and take the latest
      const latestByMatch = {}
      ;(latestMessages || []).forEach(msg => {
        if (!latestByMatch[msg.match_id]) {
          latestByMatch[msg.match_id] = msg
        }
      })

      // Count unread per match
      const unreadByMatch = {}
      ;(latestMessages || []).forEach(msg => {
        if (msg.receiver_id === currentUserId && !msg.read) {
          unreadByMatch[msg.match_id] = (unreadByMatch[msg.match_id] || 0) + 1
        }
      })

      // Build conversation objects
      const convos = matches.map(m => {
        const matchId = makeMatchId(currentUserId, m.matched_user_id)
        const profile = profileMap[m.matched_user_id] || {}
        const latest = latestByMatch[matchId]
        const name = profile.name || 'Unknown'

        return {
          id: matchId,
          matchedUserId: m.matched_user_id,
          name,
          initials: name.split(' ').map(n => n[0]).join('').toUpperCase(),
          photoUrl: profile.photo_url || null,
          role: profile.role || '',
          preview: latest ? latest.text : 'New connection! Start the conversation.',
          time: latest ? formatTime(latest.created_at) : formatTime(m.matched_at),
          unread: unreadByMatch[matchId] > 0,
          matchedAt: m.matched_at,
        }
      })

      // Sort: unread first, then by latest message time
      convos.sort((a, b) => {
        if (a.unread && !b.unread) return -1
        if (!a.unread && b.unread) return 1
        return new Date(b.time) - new Date(a.time)
      })

      setConversations(convos)
    } catch (e) {
      console.error('loadConversations failed:', e)
    }
    setLoading(false)
  }, [currentUserId])

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (matchId) => {
    if (!matchId) return
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('loadMessages failed:', error)
      return
    }
    setActiveMessages(data || [])
  }, [])

  // Send a message
  const sendMessage = useCallback(async (matchId, receiverId, text) => {
    if (!currentUserId || !text.trim()) return

    // Optimistic update
    const optimistic = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      text: text.trim(),
      read: false,
      created_at: new Date().toISOString(),
    }
    setActiveMessages(prev => [...prev, optimistic])

    // Update conversation preview
    setConversations(prev => prev.map(c =>
      c.id === matchId
        ? { ...c, preview: text.trim(), time: 'now' }
        : c
    ))

    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      text: text.trim(),
    })

    if (error) {
      console.error('sendMessage failed:', error)
      // Remove optimistic message on failure
      setActiveMessages(prev => prev.filter(m => m.id !== optimistic.id))
    }
  }, [currentUserId])

  // Mark messages as read
  const markRead = useCallback(async (matchId) => {
    if (!currentUserId) return
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .eq('receiver_id', currentUserId)
      .eq('read', false)

    setConversations(prev => prev.map(c =>
      c.id === matchId ? { ...c, unread: false } : c
    ))
  }, [currentUserId])

  // Subscribe to realtime messages
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new

          // Update active messages if viewing this conversation
          setActiveMessages(prev => {
            if (prev.length > 0 && prev[0]?.match_id === newMsg.match_id) {
              return [...prev, newMsg]
            }
            return prev
          })

          // Update conversation preview
          setConversations(prev => prev.map(c =>
            c.id === newMsg.match_id
              ? { ...c, preview: newMsg.text, time: formatTime(newMsg.created_at), unread: true }
              : c
          ))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  return {
    conversations,
    activeMessages,
    loading,
    loadConversations,
    loadMessages,
    sendMessage,
    markRead,
  }
}

function formatTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
