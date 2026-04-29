import { useState, useEffect, useCallback, useRef } from 'react'

const REPO_OWNER = 'eettoree'
const REPO_NAME = 'ducenonduce'
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`
const VALID_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.jfif']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function DuceGame() {
  const [deck, setDeck] = useState([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('loading')
  const [feedback, setFeedback] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [imgLoaded, setImgLoaded] = useState(false)
  const processing = useRef(false)

  useEffect(() => {
    async function fetchImages() {
      try {
        const getFolderData = async (name) => {
          const url = `${GITHUB_API_URL}/${name.replace(/ /g, '%20')}`
          const res = await fetch(url)
          if (res.ok) return res.json()
          const root = await fetch(GITHUB_API_URL)
          if (!root.ok) throw new Error('Accesso negato')
          const contents = await root.json()
          const folder = contents.find(
            (i) => i.type === 'dir' && i.name.toLowerCase() === name.toLowerCase()
          )
          if (!folder) throw new Error(`Cartella "${name}" mancante`)
          return (await fetch(folder.url)).json()
        }

        const [duceData, nonDuceData] = await Promise.all([
          getFolderData('duce'),
          getFolderData('non duce'),
        ])

        const process = (data, type) =>
          Array.isArray(data)
            ? data
                .filter((f) => f.type === 'file' && VALID_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)))
                .map((f) => ({ name: f.name, url: f.download_url, type }))
            : []

        const duceList = process(duceData, 'duce')
        const nonDuceList = process(nonDuceData, 'non duce')

        if (duceList.length === 0 || nonDuceList.length < 2) {
          throw new Error('Immagini insufficienti')
        }

        const shuffledNon = shuffle(nonDuceList)
        const first = shuffledNon.shift()
        const second = shuffledNon.shift()

        let specialIdx = duceList.findIndex((f) => f.name === '1.webp')
        if (specialIdx === -1) specialIdx = 0
        const third = duceList.splice(specialIdx, 1)[0]

        const remaining = shuffle([...duceList, ...shuffledNon])
        setDeck([first, second, third, ...remaining])
        setStatus('playing')
      } catch (e) {
        setErrorMsg(e.message)
        setStatus('error')
      }
    }
    fetchImages()
  }, [])

  const handleVote = useCallback(
    (vote) => {
      if (processing.current || index >= deck.length) return
      processing.current = true

      const correct = vote === deck[index].type

      if (correct) {
        setFeedback('correct')
        setScore((s) => s + 1)
        setTimeout(() => {
          setFeedback(null)
          setImgLoaded(false)
          setIndex((i) => i + 1)
          processing.current = false
        }, 500)
      } else {
        setFeedback('wrong')
        setTimeout(() => {
          setFeedback(null)
          setStatus('gameover')
          processing.current = false
        }, 700)
      }
    },
    [deck, index]
  )

  const resetGame = () => {
    setDeck(shuffle(deck))
    setIndex(0)
    setScore(0)
    setImgLoaded(false)
    setStatus('playing')
  }

  const currentCard = deck[index]

  return (
    <div className="duce-game">
      <div className="duce-header">
        <h1 className="duce-title">DUCE O NON DUCE</h1>
        <div className="duce-score-badge">
          <span className="duce-score-label">Punteggio:</span>
          <span className="duce-score-value">{score}</span>
        </div>
      </div>

      <div className="duce-arena">
        <button className="duce-btn duce-btn-desktop" onClick={() => handleVote('duce')}>
          <span className="duce-btn-emoji">🏛️</span>
          <span className="duce-btn-label">Duce</span>
        </button>

        <div className="duce-card-wrapper">
          {status === 'loading' && (
            <div className="duce-loader">
              <div className="duce-spinner" />
              <p>Caricamento archivio...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="duce-loader">
              <p style={{ color: '#f87171' }}>{errorMsg}</p>
            </div>
          )}

          {status === 'playing' && currentCard && (
            <div className="duce-card" style={{ opacity: imgLoaded ? 1 : 0.3 }}>
              <img
                src={currentCard.url}
                alt="Soggetto"
                onLoad={() => setImgLoaded(true)}
              />
              {feedback && (
                <div className={`duce-feedback ${feedback}`}>
                  {feedback === 'correct' ? '✅' : '❌'}
                </div>
              )}
            </div>
          )}

          {status === 'gameover' && (
            <div className="duce-gameover">
              <h2>DISERTATO!</h2>
              <p>Punteggio finale: <strong>{score}</strong></p>
              <button className="duce-restart" onClick={resetGame}>
                Ricomincia
              </button>
            </div>
          )}
        </div>

        <button className="duce-btn duce-btn-desktop" onClick={() => handleVote('non duce')}>
          <span className="duce-btn-emoji">🚫</span>
          <span className="duce-btn-label">Non Duce</span>
        </button>
      </div>

      <div className="duce-mobile-controls">
        <button className="duce-btn-mobile" onClick={() => handleVote('duce')}>Duce</button>
        <button className="duce-btn-mobile" onClick={() => handleVote('non duce')}>Non Duce</button>
      </div>
    </div>
  )
}
