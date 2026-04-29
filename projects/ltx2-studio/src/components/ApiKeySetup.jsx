import { useState } from 'react'
import { Key, ExternalLink, ArrowRight } from 'lucide-react'
import { setApiKey } from '../lib/storage'

export default function ApiKeySetup({ onSaved }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    setApiKey(trimmed)
    onSaved()
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-icon">
          <Key size={20} />
        </div>
        <h1 className="setup-title">Connect to fal.ai</h1>
        <p className="setup-desc">
          LTX-2 Studio uses fal.ai to run the open-source LTX-2 19B model.
          Add your API key to start generating videos.
        </p>

        <form onSubmit={handleSave} className="setup-form">
          <div className="input-wrap">
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="fal_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="input"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="show-btn"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={!value.trim()}>
            Continue <ArrowRight size={16} />
          </button>
        </form>

        <a
          href="https://fal.ai/dashboard/keys"
          target="_blank"
          rel="noreferrer"
          className="setup-link"
        >
          Get an API key from fal.ai <ExternalLink size={14} />
        </a>

        <p className="setup-note">
          Your key is stored locally in your browser. It is never sent anywhere
          except directly to fal.ai.
        </p>
      </div>
    </div>
  )
}
