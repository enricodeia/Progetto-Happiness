import { Component } from 'react'
import { C } from '../constants'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100dvh',
          background: C.bg, color: C.white,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
          padding: 40, textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 22,
            background: C.surface, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, fontSize: 28,
          }}>!</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: C.textTertiary, marginBottom: 24, lineHeight: 1.5 }}>
            The app encountered an error. Try refreshing the page.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px', borderRadius: 14, border: 'none',
              background: C.orange, color: C.white,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >Refresh</button>
        </div>
      )
    }
    return this.props.children
  }
}
