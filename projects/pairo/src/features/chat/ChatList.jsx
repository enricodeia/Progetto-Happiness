import { motion } from 'motion/react'
import { MessageCircle } from 'lucide-react'
import { C } from '../../constants'

export default function ChatList({ chats, onOpen }) {
  if (chats.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
        <div style={{ padding: '16px 0 8px' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.white, letterSpacing: '-0.02em' }}>Conversations</span>
        </div>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 40px',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 22, background: C.surface,
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
          }}>
            <MessageCircle size={26} color={C.textTertiary} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, textAlign: 'center', letterSpacing: '-0.02em' }}>
            No messages yet
          </div>
          <div style={{ fontSize: 13, color: C.textTertiary, textAlign: 'center', lineHeight: 1.5 }}>
            Save profiles and connect to start a conversation.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 8px' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: C.white, letterSpacing: '-0.02em' }}>Conversations</span>
        <div style={{
          padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,.08)',
          fontSize: 11, fontWeight: 600, color: C.white,
        }}>{chats.length}</div>
      </div>

      {/* New connections strip */}
      <div style={{ display: 'flex', gap: 12, padding: '8px 0 16px', overflowX: 'auto' }}>
        {chats.slice(0, 4).map(chat => (
          <button key={chat.id} onClick={() => onOpen(chat.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}>
            <div style={{ position: 'relative' }}>
              {chat.photoUrl ? (
                <img src={chat.photoUrl} alt="" style={{
                  width: 52, height: 52, borderRadius: 18, objectFit: 'cover',
                  border: `2px solid ${C.borderLight}`,
                }} />
              ) : (
                <div style={{
                  width: 52, height: 52, borderRadius: 18, background: C.surface3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: C.white,
                  border: `2px solid ${C.borderLight}`,
                }}>{chat.initials}</div>
              )}
              {chat.online && (
                <div style={{
                  position: 'absolute', bottom: 0, right: -1,
                  width: 14, height: 14, borderRadius: 7,
                  background: C.green, border: `2.5px solid ${C.bg}`,
                }} />
              )}
            </div>
            <span style={{ fontSize: 10, color: C.textSecondary, fontWeight: 500, maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chat.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      <div style={{
        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: C.textTertiary, marginBottom: 8,
      }}>Recent</div>

      <div>
        {chats.map((chat, idx) => (
          <motion.button
            key={chat.id}
            onClick={() => onOpen(chat.id)}
            whileTap={{ scale: 0.98, backgroundColor: 'rgba(255,255,255,.03)' }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 0',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              borderBottom: idx < chats.length - 1 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {chat.photoUrl ? (
                <img src={chat.photoUrl} alt="" style={{
                  width: 46, height: 46, borderRadius: 15, objectFit: 'cover',
                }} />
              ) : (
                <div style={{
                  width: 46, height: 46, borderRadius: 15, background: C.surface3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, color: C.white,
                }}>{chat.initials}</div>
              )}
              {chat.online && (
                <div style={{
                  position: 'absolute', bottom: 0, right: -1,
                  width: 12, height: 12, borderRadius: 6,
                  background: C.green, border: `2px solid ${C.bg}`,
                }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: chat.unread ? 700 : 500, color: C.white }}>{chat.name}</span>
                <span style={{ fontSize: 10.5, color: chat.unread ? C.orange : C.textTertiary }}>{chat.time}</span>
              </div>
              <div style={{
                fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: chat.unread ? C.textSecondary : C.textTertiary,
                fontWeight: chat.unread ? 500 : 400,
              }}>{chat.preview}</div>
            </div>
            {chat.unread && (
              <div style={{
                width: 8, height: 8, borderRadius: 4, background: C.orange, flexShrink: 0,
              }} />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
