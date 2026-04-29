import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, Send } from 'lucide-react'
import { C } from '../../constants'

export default function ChatDetail({ conversation, messages, currentUserId, onBack, onSend }) {
  const [input, setInput] = useState('')
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages.length])

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexShrink: 0,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={22} color={C.white} />
        </button>
        {conversation.photoUrl ? (
          <img src={conversation.photoUrl} alt="" style={{
            width: 30, height: 30, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 30, height: 30, borderRadius: 10, background: C.surface3, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: C.white,
          }}>{conversation.initials}</div>
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{conversation.name}</div>
          <div style={{ fontSize: 10, color: C.textTertiary }}>{conversation.role}</div>
        </div>
      </div>

      <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 14, color: C.textTertiary, marginBottom: 4 }}>
              You matched with {conversation.name}!
            </div>
            <div style={{ fontSize: 12, color: C.textTertiary }}>
              Send the first message to start the conversation.
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id || i} style={{
              display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
              marginBottom: 6,
            }}>
              <div style={{
                maxWidth: '78%', padding: '9px 13px', borderRadius: 16,
                background: isMe
                  ? C.orange
                  : C.surface2,
                color: C.white, fontSize: 13.5, fontWeight: 400, lineHeight: 1.45,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
              }}>{msg.text}</div>
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 10px', flexShrink: 0,
        borderTop: `1px solid ${C.border}`,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '9px 14px', borderRadius: 14,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.white, fontSize: 13, outline: 'none',
            fontFamily: 'Space Grotesk, sans-serif',
          }}
        />
        <motion.button
          onClick={handleSend}
          whileTap={{ scale: 0.88 }}
          style={{
            width: 34, height: 34, borderRadius: 12,
            background: C.orange,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Send size={15} color={C.white} />
        </motion.button>
      </div>
    </div>
  )
}
