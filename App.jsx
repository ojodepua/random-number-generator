import { useState } from 'react'
import './App.css'

function App() {
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('100')
  const [qty, setQty] = useState('1')
  const [noRepeat, setNoRepeat] = useState(false)

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('gnr-history-v1')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [historyPage, setHistoryPage] = useState(1)

  const HISTORY_LIMIT = 1000
  const HISTORY_PAGE_SIZE = 50

  function updateHistory(nextHistory) {
    setHistory(nextHistory)
    try {
      localStorage.setItem('gnr-history-v1', JSON.stringify(nextHistory))
    } catch {
      // Si el almacenamiento local no está disponible, el historial sigue funcionando durante la sesión.
    }
  }

  function resetHistory() {
    updateHistory([])
    setHistoryPage(1)
  }

  function formatGenerationTime(timestamp) {
    const date = new Date(timestamp)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    const ms = String(date.getMilliseconds()).padStart(3, '0')
    return `${hh}:${mm}:${ss}:${ms}`
  }

  // =========================================================
  // SANITIZAR INPUTS
  // =========================================================

  function sanitizeInput(value, allowNegative = true) {
    if (allowNegative) {
      let clean = value.replace(/[^0-9-]/g, '')

      const negative = clean.startsWith('-')

      clean =
        (negative ? '-' : '') +
        clean.replace(/-/g, '')

      return clean
    }

    return value.replace(/[^0-9]/g, '')
  }

  function handleMinChange(e) {
    setMin(sanitizeInput(e.target.value, true))
    setError('')
  }

  function handleMaxChange(e) {
    setMax(sanitizeInput(e.target.value, true))
    setError('')
  }

  function handleQtyChange(e) {
    setQty(sanitizeInput(e.target.value, false))
    setError('')
  }

  // =========================================================
  // GENERADOR
  // =========================================================

  function generateNumbers() {
    setError('')

    const parsedMin = Number(min)
    const parsedMax = Number(max)
    const parsedQty = Number(qty)

    if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || !Number.isFinite(parsedQty)) {
      setError('Todos los valores deben ser numéricos.')
      return
    }

    if (!Number.isInteger(parsedMin) || !Number.isInteger(parsedMax) || !Number.isInteger(parsedQty)) {
      setError('Los valores deben ser números enteros.')
      return
    }

    if (parsedQty < 1 || parsedQty > 100) {
      setError('La cantidad debe estar entre 1 y 100.')
      return
    }

    if (parsedMin > parsedMax) {
      setError('El valor DESDE no puede ser mayor que HASTA.')
      return
    }

    if (parsedMin === parsedMax) {
      setError('DESDE y HASTA no pueden ser iguales.')
      return
    }

    const rangeSize = parsedMax - parsedMin + 1

    if (noRepeat && parsedQty > rangeSize) {
      setError('La cantidad solicitada supera los números disponibles sin repetir.')
      return
    }

    setIsGenerating(true)

    window.setTimeout(() => {
      let values = []

      if (noRepeat) {
        const pool = Array.from(
          { length: rangeSize },
          (_, index) => parsedMin + index
        )

        for (let i = pool.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }

        values = pool.slice(0, parsedQty)
      } else {
        values = Array.from(
          { length: parsedQty },
          () => Math.floor(Math.random() * rangeSize) + parsedMin
        )
      }

      setResult(values)

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
        values,
        min: parsedMin,
        max: parsedMax,
        qty: parsedQty,
        noRepeat,
      }

      const nextHistory = [entry, ...history].slice(0, HISTORY_LIMIT)
      updateHistory(nextHistory)
      setHistoryPage(1)
      setIsGenerating(false)
    }, 320)
  }

  // =========================================================
  // VISOR
  // =========================================================

  const resultText = result ? result.join(' · ') : ''

  const digitCount = result
    ? result.reduce(
        (sum, value) =>
          sum + String(value).replace(/-/g, '').length,
        0
      )
    : 0

  const compact = digitCount >= 3 && digitCount <= 4
  const tooManyDigits = digitCount > 4

  const historyStart = (historyPage - 1) * HISTORY_PAGE_SIZE
  const visibleHistory = history.slice(
    historyStart,
    historyStart + HISTORY_PAGE_SIZE
  )
  const historyTotalPages = Math.max(
    1,
    Math.ceil(history.length / HISTORY_PAGE_SIZE)
  )

  return (
    <>
      <main className="gna-app">
        <header className="gna-header">
          <div>
            <div className="gna-kicker">RANDOM NUMBER GENERATOR</div>
            <h1>GNR</h1>
          </div>
          <div className="gna-header-mark">01</div>
        </header>

        <section className="gna-panel">
          <div className="gna-form">
            <label>
              <span>DESDE</span>
              <input
                value={min}
                onChange={handleMinChange}
                inputMode="numeric"
                aria-label="Desde"
              />
            </label>

            <label>
              <span>HASTA</span>
              <input
                value={max}
                onChange={handleMaxChange}
                inputMode="numeric"
                aria-label="Hasta"
              />
            </label>

            <label>
              <span>CANTIDAD</span>
              <input
                value={qty}
                onChange={handleQtyChange}
                inputMode="numeric"
                aria-label="Cantidad"
              />
            </label>

            <label className="gna-check">
              <input
                type="checkbox"
                checked={noRepeat}
                onChange={(e) => {
                  setNoRepeat(e.target.checked)
                  setError('')
                }}
              />
              <span>No repetir números</span>
            </label>

            <button
              className={`gna-generate ${isGenerating ? 'is-generating' : ''}`}
              onClick={generateNumbers}
              disabled={isGenerating}
            >
              GENERAR
            </button>
          </div>

          {error && <div className="gna-error">{error}</div>}

          <section className="gna-result-card">
            <div className="gna-result-title">RESULTADO</div>

            <div className="gna-result">
              <div className="gna-gauge">
                <div className="gna-liquid"></div>
                <div className="gna-waterline"></div>
                <div className="gna-inner-glow"></div>
              </div>

              <div className="gna-hud">
                <div
                  className={`gna-number ${compact ? 'compact' : ''} ${tooManyDigits ? 'too-many' : ''}`}
                  id="gnaNumber"
                >
                  {!tooManyDigits && resultText}
                </div>

                {tooManyDigits && (
                  <div className="gna-more visible" id="gnaMore">
                    <span className="gna-more-arrows">
                      <span className="gna-more-arrow"></span>
                      <span className="gna-more-arrow"></span>
                      <span className="gna-more-arrow"></span>
                    </span>
                  </div>
                )}
              </div>

              <div className="gna-chevrons" aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => (
                  <Chevron key={index} />
                ))}
              </div>

              <div className="gna-center"></div>
            </div>
          </section>

          <section className="gna-history">
            <div className="gna-history-head">
              <div>
                <div className="gna-result-title">HISTORIAL</div>
                <div className="gna-history-count">
                  {history.length} generación{history.length === 1 ? '' : 'es'}
                </div>
              </div>
              <button
                className="gna-reset"
                onClick={resetHistory}
                disabled={!history.length}
              >
                RESETEAR
              </button>
            </div>

            <div className="gna-history-list">
              {visibleHistory.length ? (
                visibleHistory.map((entry) => (
                  <div className="history-row" key={entry.id}>
                    <div
                      className="history-values"
                      title={entry.values.join(' · ')}
                    >
                      {entry.values.join(' · ')}
                    </div>
                    <div className="history-meta">
                      {formatGenerationTime(entry.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="gna-history-empty">Todavía no hay generaciones.</div>
              )}
            </div>

            {history.length > HISTORY_PAGE_SIZE && (
              <div className="gna-pagination">
                <button
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  disabled={historyPage === 1}
                  aria-label="Página anterior"
                >
                  ←
                </button>
                <span>
                  {historyPage} / {historyTotalPages}
                </span>
                <button
                  onClick={() =>
                    setHistoryPage((page) =>
                      Math.min(historyTotalPages, page + 1)
                    )
                  }
                  disabled={historyPage === historyTotalPages}
                  aria-label="Página siguiente"
                >
                  →
                </button>
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  )
}


// ============================================================
// CHEVRON
// ============================================================

function Chevron() {
  return (
    <svg
      viewBox="0 0 100 60"
      aria-hidden="true"
    >
      <path
        d="M10 48 L50 10 L90 48"
      />
    </svg>
  )
}


export default App
