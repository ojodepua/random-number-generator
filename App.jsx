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

  // =========================================================
  // VALIDACIÓN
  // =========================================================

  function validate() {
    const minNumber = Number(min)
    const maxNumber = Number(max)
    const qtyNumber = Number(qty)

    if (
      !Number.isFinite(minNumber) ||
      !Number.isFinite(maxNumber) ||
      !Number.isFinite(qtyNumber)
    ) {
      return '⚠️ Atención: completa todos los campos con números válidos.'
    }

    if (
      !Number.isInteger(minNumber) ||
      !Number.isInteger(maxNumber) ||
      !Number.isInteger(qtyNumber)
    ) {
      return '⚠️ Atención: el generador trabaja únicamente con números enteros.'
    }

    if (qtyNumber < 1 || qtyNumber > 100) {
      return '⚠️ Atención: la cantidad debe estar entre 1 y 100 números.'
    }

    if (minNumber > maxNumber) {
      return '⚠️ Atención: el valor de Desde no puede ser mayor que Hasta. Revisa el rango ingresado.'
    }

    if (minNumber === maxNumber) {
      return '⚠️ Atención: ingresaste el mismo número en Desde y Hasta. No se generará ningún número.'
    }

    const rangeSize = maxNumber - minNumber + 1

    if (noRepeat && qtyNumber > rangeSize) {
      return `⚠️ Atención: quieres generar ${qtyNumber} números sin repetir, pero el rango seleccionado solo contiene ${rangeSize} números posibles. Reduce la cantidad o amplía el rango.`
    }

    return ''
  }

  // =========================================================
  // GENERAR NÚMEROS
  // =========================================================

  function generate() {
    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')

    const minNumber = Number(min)
    const maxNumber = Number(max)
    const qtyNumber = Number(qty)

    const rangeSize = maxNumber - minNumber + 1

    const values = []

    if (noRepeat) {
      // Fisher-Yates
      const pool = Array.from(
        { length: rangeSize },
        (_, index) => minNumber + index
      )

      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))

        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }

      values.push(...pool.slice(0, qtyNumber))
    } else {
      for (let i = 0; i < qtyNumber; i++) {
        values.push(
          Math.floor(Math.random() * rangeSize) + minNumber
        )
      }
    }

    const historyEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      values,
      min: minNumber,
      max: maxNumber,
      qty: qtyNumber,
      noRepeat
    }

    const nextHistory = [historyEntry, ...history].slice(0, HISTORY_LIMIT)
    updateHistory(nextHistory)
    setHistoryPage(1)

    // Reiniciamos la animación
    setIsGenerating(false)

    setTimeout(() => {
      setResult(values)
      setIsGenerating(true)
    }, 20)
  }

  // =========================================================
  // INFORMACIÓN DEL RESULTADO
  // =========================================================

  // Cantidad TOTAL de dígitos de todos los resultados.
  //
  // Ejemplo:
  //
  // 12 · 34 = 4 dígitos
  //
  // 12 · 345 = 5 dígitos
  //
  // 123 · 45 = 5 dígitos
  //
  // Cuando supera 4, mostramos las 3 flechas hacia abajo.
  const digitCount = result
    ? result.reduce(
        (total, value) =>
          total +
          String(value).replace(/-/g, '').length,
        0
      )
    : 0

  const compact =
    digitCount >= 3 &&
    digitCount <= 4

  const resultDensity = result
    ? result.length >= 60
      ? 'ultra-dense'
      : result.length >= 20
        ? 'dense'
        : ''
    : ''

  const tooManyDigits = digitCount > 4

  // Cuando el resultado ocupa más de 4 dígitos en total, el visor vuelve
  // al comportamiento original: oculta los números y muestra las tres
  // flechas hacia abajo para indicar que deben revisarse en el historial.
  const displayedResult = tooManyDigits
    ? ''
    : result
      ? result.join(' · ')
      : '—'

  const historyPageCount = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE))
  const safeHistoryPage = Math.min(historyPage, historyPageCount)
  const historyStart = (safeHistoryPage - 1) * HISTORY_PAGE_SIZE
  const visibleHistory = history.slice(historyStart, historyStart + HISTORY_PAGE_SIZE)

  // =========================================================
  // JSX
  // =========================================================

  return (
    <>
      <style>{`

        /* ==================================================
           BASE
        ================================================== */

        * {
          box-sizing: border-box;
        }

        html {
          min-height: 100%;
          background: #050A0F;
        }

        body {
          margin: 0;
          min-height: 100vh;

          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(83, 30, 180, .45),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 100%,
              rgba(18, 102, 255, .30),
              transparent 30%
            ),
            #050A0F;

          color: #f5f7fb;

          font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
          border: 0;
        }


        /* ==================================================
           APP
        ================================================== */

        .app {
          min-height: 100vh;

          display: flex;
          justify-content: center;
          align-items: center;

          padding: 40px 20px;
        }


        /* ==================================================
           CARD PRINCIPAL
        ================================================== */

        .generator-card {
          width: min(1000px, 100%);

          padding: 38px;

          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              rgba(10, 22, 65, .96),
              rgba(22, 8, 54, .96)
            );

          border: 1px solid rgba(116, 88, 255, .55);

          box-shadow:
            0 0 40px rgba(73, 39, 255, .20),
            inset 0 0 40px rgba(255,255,255,.02);
        }


        /* ==================================================
           HEADER
        ================================================== */

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .header h1 {
          margin: 0;

          font-size: clamp(36px, 6vw, 58px);

          line-height: 1;

          letter-spacing: -2px;

          background:
            linear-gradient(
              90deg,
              #ffffff,
              #bb7cff,
              #20c9ff
            );

          -webkit-background-clip: text;
          background-clip: text;

          color: transparent;
        }

        .header p {
          margin: 16px 0 0;

          color: #aeb8d4;

          font-size: 17px;
        }


        /* ==================================================
           CONFIGURACIÓN
        ================================================== */

        .config {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 14px;

          padding: 18px;

          border-radius: 18px;

          background: #0f131b;

          border: 1px solid #292f3c;
        }

        .field {
          display: flex;
          flex-direction: column;

          gap: 7px;
        }

        .field label {
          font-size: 12px;

          color: #929bab;

          font-weight: 700;

          letter-spacing: .06em;
        }

        .field input {
          width: 100%;

          min-height: 44px;

          background: #0e1219;

          color: #fff;

          border:
            1px solid #292f3c;

          border-radius: 10px;

          padding: 11px 12px;

          outline: none;
        }

        .field input:focus {
          border-color: #7c5cff;

          box-shadow:
            0 0 0 3px #7c5cff22;
        }

        .check-container {
          grid-column: 1 / -1;

          display: flex;

          align-items: center;

          gap: 8px;

          margin-top: 2px;

          color: #d4d9eb;

          font-size: 14px;
        }

        .check-container input {
          width: 18px;
          height: 18px;

          accent-color: #7c5cff;
        }


        /* ==================================================
           MENSAJE DE VALIDACIÓN
        ================================================== */

        .message {
          margin-top: 14px;

          padding: 12px 13px;

          border-radius: 10px;

          font-size: 13px;

          background: #3a1821;

          border: 1px solid #a62d43;

          color: #ffb9c3;
        }


        /* ==================================================
           BOTÓN GENERAR
        ================================================== */

        .generate-button {
          width: 100%;

          min-height: 58px;

          margin-top: 18px;

          border-radius: 15px;

          color: white;

          font-weight: 850;

          font-size: 18px;

          background:
            linear-gradient(
              90deg,
              #168cff,
              #633cff,
              #ec32dc
            );

          box-shadow:
            0 10px 30px
            rgba(86,52,255,.30);

          transition:
            .15s;
        }

        .generate-button:hover {
          filter: brightness(1.08);

          transform:
            translateY(-1px);
        }


        /* ==================================================
           VISOR
        ================================================== */

        .result-wrapper {
          display: flex;

          justify-content: center;

          margin:
            25px auto 5px;
        }

        .gna-result {
          position: relative;

          display: grid;

          place-items: center;

          width:
            min(390px, 100%);

          aspect-ratio: 1;

          background: transparent;

          border: 0;

          border-radius: 50%;

          padding: 0;

          margin:
            18px auto 2px;
        }


        /* ==================================================
           GAUGE
        ================================================== */

        .gna-gauge {
          position: absolute;

          inset: 3%;

          border-radius: 50%;

          background: #020608;

          border:
            3px solid #263840;

          box-shadow:
            inset 0 0 28px #000,
            0 0 24px #02070a;

          overflow: hidden;
        }


        /* ==================================================
           LÍQUIDO
        ================================================== */

        .gna-liquid {
          position: absolute;

          inset: 0;

          border-radius: 50%;

          background:
            radial-gradient(
              circle at 50% 55%,
              rgba(79,184,229,.98) 0 18%,
              rgba(48,147,200,.97) 44%,
              rgba(35,111,172,.94) 72%,
              rgba(12,61,98,.95) 100%
            );

          -webkit-mask:
            radial-gradient(
              circle at center,
              transparent 0 56.5%,
              #000 57.5% 100%
            );

          mask:
            radial-gradient(
              circle at center,
              transparent 0 56.5%,
              #000 57.5% 100%
            );

          clip-path:
            inset(100% 0 0 0);

          filter:
            drop-shadow(
              0 0 13px
              rgba(54,177,229,.6)
            );
        }


        /* ==================================================
           LÍNEA DE AGUA
        ================================================== */

        .gna-waterline {
          position: absolute;

          left: 7%;
          right: 7%;

          height: 10px;

          bottom: 0;

          border-radius: 50%;

          background:
            linear-gradient(
              90deg,
              transparent,
              #9fe5fb 18%,
              #d5f8ff 50%,
              #9fe5fb 82%,
              transparent
            );

          opacity: 0;

          filter: blur(3px);

          pointer-events: none;
        }


        /* ==================================================
           INNER GLOW
        ================================================== */

        .gna-inner-glow {
          position: absolute;

          z-index: 2;

          width: 58%;
          height: 58%;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(61,173,218,.56) 0 18%,
              rgba(47,140,182,.30) 40%,
              rgba(25,86,119,.10) 58%,
              transparent 74%
            );

          opacity: .15;

          filter: blur(5px);

          transform: scale(.86);
        }


        /* ==================================================
           HUD CENTRAL
        ================================================== */

        .gna-hud {
          position: absolute;

          z-index: 3;

          width: 58%;
          height: 58%;

          border-radius: 50%;

          display: grid;

          place-items: center;

          text-align: center;

          overflow: hidden;

          background: #04090d;

          border:
            2px solid #314952;

          box-shadow:
            inset 0 0 24px #000,
            0 0 20px #000;
        }

        .gna-hud::before {
          content: "";

          position: absolute;

          inset: 5%;

          border-radius: 50%;

          border:
            1px solid #7aa9b633;

          box-shadow:
            inset 0 0 14px #000;
        }


        /* ==================================================
           NÚMERO
        ================================================== */

        .gna-number {
          position: relative;

          z-index: 5;

          width: 100%;

          display: flex;

          justify-content: center;

          align-items: center;

          white-space: normal;

          flex-wrap: wrap;

          align-content: center;

          gap: .18em;

          font-size:
            clamp(50px, 7vw, 76px);

          line-height: .8;

          font-weight: 900;

          color: #eefaff;

          text-shadow:
            0 0 10px #70c8ea33;
        }

        .gna-number.compact {
          font-size:
            clamp(34px, 5vw, 54px);

          gap: .28em;

          letter-spacing: -1px;
        }

        .gna-number.dense {
          font-size: clamp(12px, 2.5vw, 24px);
          line-height: 1.08;
          gap: .12em;
          letter-spacing: -0.35px;
          max-height: 92%;
          overflow: hidden;
        }

        .gna-number.ultra-dense {
          font-size: clamp(7px, 1.55vw, 12px);
          line-height: 1.08;
          gap: .08em;
          letter-spacing: 0;
          max-height: 94%;
          overflow: hidden;
        }

        .gna-number.hidden {
          display: none;
        }


        /* ==================================================
           TRES FLECHAS HACIA ABAJO
           Se muestran cuando el total supera 4 dígitos.
        ================================================== */

        .gna-more {
          position: relative;

          z-index: 6;

          display: none;

          margin-top: 10px;

          color: #fff;

          line-height: .75;

          font-size:
            clamp(50px, 7vw, 76px);

          font-weight: 900;

          white-space: nowrap;

          text-shadow:
            0 0 9px #ffffff55;
        }

        .gna-more.visible {
          display: block;
        }

        .gna-more-arrows {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: .12em;

          height: 1em;
        }

        .gna-more-arrow {
          position: relative;

          width: .48em;
          height: .82em;

          display: inline-block;

          filter: blur(1.6px);

          opacity: .9;
        }

        .gna-more-arrow::before {
          content: "";

          position: absolute;

          left: 50%;
          top: 0;

          width: .10em;
          height: .58em;

          transform:
            translateX(-50%);

          border-radius: 99px;

          background:
            currentColor;

          box-shadow:
            0 0 .10em
            currentColor;
        }

        .gna-more-arrow::after {
          content: "";

          position: absolute;

          left: 50%;
          bottom: .02em;

          width: .36em;
          height: .36em;

          transform:
            translateX(-50%)
            rotate(45deg);

          border-right:
            .10em solid
            currentColor;

          border-bottom:
            .10em solid
            currentColor;

          box-shadow:
            .04em .04em .10em
            currentColor;
        }


        /* ==================================================
           FLECHAS / CHEVRONES
        ================================================== */

        .gna-chevrons {
          position: absolute;

          z-index: 6;

          inset: 9%;

          overflow: hidden;

          pointer-events: none;

          opacity: 0;
        }

        .gna-chev {
          position: absolute;

          left: 50%;

          width: 48px;
          height: 30px;

          transform:
            translateX(-50%);

          opacity: 0;

          filter: blur(3px);

          will-change:
            transform,
            opacity;
        }

        .gna-chev svg {
          width: 100%;
          height: 100%;

          overflow: visible;
        }

        .gna-chev path {
          fill: none;

          stroke:
            rgba(248,253,255,.86);

          stroke-width: 10;

          stroke-linecap: round;

          stroke-linejoin: round;

          filter:
            drop-shadow(
              0 0 7px
              rgba(255,255,255,.55)
            );
        }


        /* ==================================================
           POSICIONES
        ================================================== */

        .gna-s1 {
          top: 76%;
          left: 38%;
        }

        .gna-s2 {
          top: 70%;
          left: 58%;
        }

        .gna-s3 {
          top: 65%;
          left: 44%;
        }

        .gna-s4 {
          top: 60%;
          left: 63%;
        }

        .gna-s5 {
          top: 55%;
          left: 35%;
        }

        .gna-s6 {
          top: 50%;
          left: 57%;
        }

        .gna-s7 {
          top: 45%;
          left: 47%;
        }


        .gna-m1 {
          top: 68%;
          left: 40%;

          width: 72px;
          height: 43px;
        }

        .gna-m2 {
          top: 61%;
          left: 62%;

          width: 78px;
          height: 47px;
        }

        .gna-m3 {
          top: 55%;
          left: 36%;

          width: 84px;
          height: 50px;
        }

        .gna-m4 {
          top: 49%;
          left: 59%;

          width: 91px;
          height: 54px;
        }


        .gna-l1 {
          top: 58%;
          left: 41%;

          width: 113px;
          height: 67px;
        }

        .gna-l2 {
          top: 50%;
          left: 60%;

          width: 130px;
          height: 76px;
        }

        .gna-hero {
          top: 40%;
          left: 50%;

          width: 178px;
          height: 106px;
        }


        .gna-rm1 {
          top: 49%;
          left: 60%;

          width: 91px;
          height: 54px;
        }

        .gna-rm2 {
          top: 55%;
          left: 38%;

          width: 82px;
          height: 49px;
        }

        .gna-rm3 {
          top: 61%;
          left: 57%;

          width: 73px;
          height: 44px;
        }


        .gna-rs1 {
          top: 50%;
          left: 42%;

          width: 62px;
          height: 37px;
        }

        .gna-rs2 {
          top: 55%;
          left: 61%;

          width: 54px;
          height: 32px;
        }

        .gna-rs3 {
          top: 60%;
          left: 37%;

          width: 48px;
          height: 29px;
        }

        .gna-rs4 {
          top: 65%;
          left: 58%;

          width: 43px;
          height: 26px;
        }

        .gna-rs5 {
          top: 70%;
          left: 41%;

          width: 38px;
          height: 23px;
        }

        .gna-rs6 {
          top: 74%;
          left: 55%;

          width: 34px;
          height: 21px;
        }


        /* ==================================================
           PUNTO CENTRAL
        ================================================== */

        .gna-center {
          position: absolute;

          z-index: 7;

          bottom: 7%;

          width: 38px;
          height: 38px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              #e7fbff 0 13%,
              #62d2ee 16% 34%,
              #164253 38% 60%,
              #050b10 64%
            );

          border:
            2px solid #72d9f2;

          box-shadow:
            0 0 15px
            #62dbf455;
        }


        /* ==================================================
           ANIMACIONES
           Duración original: 6.2 segundos
        ================================================== */

        .gna-result.boost
        .gna-liquid {
          animation:
            gnaFillDrain
            6.2s
            cubic-bezier(.18,.72,.18,1)
            forwards;
        }

        .gna-result.boost
        .gna-waterline {
          animation:
            gnaLineUp
            .65s
            cubic-bezier(.15,.8,.2,1)
            forwards;
        }

        .gna-result.boost
        .gna-inner-glow {
          animation:
            gnaGlow
            6.2s
            ease-out
            forwards;
        }

        .gna-result.boost
        .gna-hud {
          animation:
            gnaHudPulse
            6.2s
            ease-out
            forwards;
        }

        .gna-result.boost
        .gna-number {
          animation:
            gnaNumberPulse
            .30s
            ease-out;
        }

        .gna-result.boost
        .gna-more {
          animation:
            gnaNumberPulse
            .30s
            ease-out;
        }

        .gna-result.boost
        .gna-center {
          animation:
            gnaCenterPulse
            .42s
            ease-out;
        }

        .gna-result.boost
        .gna-chevrons {
          opacity: 1;
        }


        /* ==================================================
           FLECHAS PEQUEÑAS
        ================================================== */

        .gna-result.boost
        .gna-s1 {
          animation:
            gnaSmallRise
            .75s
            ease-out
            .00s
            forwards;
        }

        .gna-result.boost
        .gna-s2 {
          animation:
            gnaSmallRise
            .75s
            ease-out
            .04s
            forwards;
        }

        .gna-result.boost
        .gna-s3 {
          animation:
            gnaSmallRise
            .75s
            ease-out
            .08s
            forwards;
        }

        .gna-result.boost
        .gna-s4 {
          animation:
            gnaSmallRise
            .75s
            ease-out
            .12s
            forwards;
        }

        .gna-result.boost
        .gna-s5 {
          animation:
            gnaSmallRise
            .75s
            ease-out
            .16s
            forwards;
        }

        .gna-result.boost
        .gna-s6 {
          animation:
            gnaSmallRise
            .75s
            ease-out
            .20s
            forwards;
        }

        .gna-result.boost
        .gna-s7 {
          animation:
            gnaSmallRise
            .75s
            ease-out
            .24s
            forwards;
        }


        /* ==================================================
           FLECHAS MEDIANAS
        ================================================== */

        .gna-result.boost
        .gna-m1 {
          animation:
            gnaMidRise
            .85s
            ease-out
            .12s
            forwards;
        }

        .gna-result.boost
        .gna-m2 {
          animation:
            gnaMidRise
            .85s
            ease-out
            .18s
            forwards;
        }

        .gna-result.boost
        .gna-m3 {
          animation:
            gnaMidRise
            .85s
            ease-out
            .24s
            forwards;
        }

        .gna-result.boost
        .gna-m4 {
          animation:
            gnaMidRise
            .85s
            ease-out
            .30s
            forwards;
        }


        /* ==================================================
           FLECHAS GRANDES
        ================================================== */

        .gna-result.boost
        .gna-l1 {
          animation:
            gnaLargeRise
            .95s
            ease-out
            .34s
            forwards;
        }

        .gna-result.boost
        .gna-l2 {
          animation:
            gnaLargeRise
            .95s
            ease-out
            .43s
            forwards;
        }

        .gna-result.boost
        .gna-hero {
          animation:
            gnaHeroRise
            1.05s
            ease-out
            .52s
            forwards;
        }


        /* ==================================================
           FLECHAS DE RETORNO
        ================================================== */

        .gna-result.boost
        .gna-rm1 {
          animation:
            gnaReverseMid
            .82s
            ease-out
            .78s
            forwards;
        }

        .gna-result.boost
        .gna-rm2 {
          animation:
            gnaReverseMid
            .82s
            ease-out
            .84s
            forwards;
        }

        .gna-result.boost
        .gna-rm3 {
          animation:
            gnaReverseMid
            .82s
            ease-out
            .90s
            forwards;
        }


        /* ==================================================
           FLECHAS PEQUEÑAS DE RETORNO
        ================================================== */

        .gna-result.boost
        .gna-rs1 {
          animation:
            gnaReverseSmall
            .72s
            ease-out
            .96s
            forwards;
        }

        .gna-result.boost
        .gna-rs2 {
          animation:
            gnaReverseSmall
            .72s
            ease-out
            1.01s
            forwards;
        }

        .gna-result.boost
        .gna-rs3 {
          animation:
            gnaReverseSmall
            .72s
            ease-out
            1.06s
            forwards;
        }

        .gna-result.boost
        .gna-rs4 {
          animation:
            gnaReverseSmall
            .72s
            ease-out
            1.11s
            forwards;
        }

        .gna-result.boost
        .gna-rs5 {
          animation:
            gnaReverseSmall
            .72s
            ease-out
            1.16s
            forwards;
        }

        .gna-result.boost
        .gna-rs6 {
          animation:
            gnaReverseSmall
            .72s
            ease-out
            1.21s
            forwards;
        }


        /* ==================================================
           KEYFRAMES
        ================================================== */

        @keyframes gnaFillDrain {

          0% {
            clip-path:
              inset(100% 0 0 0);
          }

          9% {
            clip-path:
              inset(0 0 0 0);

            filter:
              drop-shadow(
                0 0 20px
                rgba(63,188,238,.95)
              );
          }

          22% {
            clip-path:
              inset(0 0 0 0);
          }

          100% {
            clip-path:
              inset(100% 0 0 0);

            filter:
              drop-shadow(
                0 0 3px
                rgba(69,180,231,.08)
              );
          }
        }


        @keyframes gnaLineUp {

          0% {
            bottom: 0;

            opacity: 0;

            transform:
              scaleX(.6);
          }

          45% {
            bottom: 97%;

            opacity: .9;

            transform:
              scaleX(1);
          }

          100% {
            bottom: 97%;

            opacity: 0;

            transform:
              scaleX(.8);
          }
        }


        @keyframes gnaGlow {

          0% {
            opacity: .15;

            transform:
              scale(.86);
          }

          8% {
            opacity: 1;

            transform:
              scale(1.06);
          }

          22% {
            opacity: .58;

            transform:
              scale(1);
          }

          100% {
            opacity: .08;

            transform:
              scale(.88);
          }
        }


        @keyframes gnaHudPulse {

          0% {
            background: #04090d;

            box-shadow:
              inset 0 0 24px #000,
              0 0 20px #000;
          }

          9% {
            background: #1e5666;

            box-shadow:
              inset 0 0 28px #a2edff44,
              0 0 30px #61d5f044;
          }

          19% {
            background: #061016;
          }

          100% {
            background: #04090d;

            box-shadow:
              inset 0 0 24px #000,
              0 0 20px #000;
          }
        }


        @keyframes gnaNumberPulse {

          0% {
            transform:
              scale(.90);

            opacity: .6;
          }

          55% {
            transform:
              scale(1.07);

            opacity: 1;

            color: #f5fdff;

            text-shadow:
              0 0 20px #8ae6ff;
          }

          100% {
            transform:
              scale(1);

            opacity: 1;
          }
        }


        @keyframes gnaCenterPulse {

          0% {
            filter:
              brightness(1);
          }

          35% {
            filter:
              brightness(2.2);

            box-shadow:
              0 0 26px
              #6fe8ffcc;
          }

          100% {
            filter:
              brightness(1);
          }
        }


        @keyframes gnaSmallRise {

          0% {
            opacity: 0;

            transform:
              translate(-50%,55px)
              scale(.30);
          }

          18% {
            opacity: .38;

            transform:
              translate(-50%,32px)
              scale(.42);
          }

          50% {
            opacity: .28;

            transform:
              translate(-50%,0)
              scale(.55);
          }

          78% {
            opacity: .11;

            transform:
              translate(-50%,-38px)
              scale(.36);
          }

          100% {
            opacity: 0;

            transform:
              translate(-50%,-72px)
              scale(.22);
          }
        }


        @keyframes gnaMidRise {

          0% {
            opacity: 0;

            transform:
              translate(-50%,48px)
              scale(.45);
          }

          20% {
            opacity: .58;

            transform:
              translate(-50%,20px)
              scale(.58);
          }

          50% {
            opacity: .46;

            transform:
              translate(-50%,-10px)
              scale(.80);
          }

          74% {
            opacity: .20;

            transform:
              translate(-50%,-42px)
              scale(.63);
          }

          100% {
            opacity: 0;

            transform:
              translate(-50%,-76px)
              scale(.40);
          }
        }


        @keyframes gnaLargeRise {

          0% {
            opacity: 0;

            transform:
              translate(-50%,42px)
              scale(.50);
          }

          20% {
            opacity: .66;

            transform:
              translate(-50%,15px)
              scale(.66);
          }

          50% {
            opacity: .52;

            transform:
              translate(-50%,-18px)
              scale(1);
          }

          73% {
            opacity: .23;

            transform:
              translate(-50%,-49px)
              scale(.78);
          }

          100% {
            opacity: 0;

            transform:
              translate(-50%,-82px)
              scale(.48);
          }
        }


        @keyframes gnaHeroRise {

          0% {
            opacity: 0;

            transform:
              translate(-50%,30px)
              scale(.52);
          }

          22% {
            opacity: .70;

            transform:
              translate(-50%,5px)
              scale(.72);
          }

          45% {
            opacity: .60;

            transform:
              translate(-50%,-8px)
              scale(1.08);
          }

          62% {
            opacity: .48;

            transform:
              translate(-50%,-20px)
              scale(.96);
          }

          80% {
            opacity: .20;

            transform:
              translate(-50%,-43px)
              scale(.70);
          }

          100% {
            opacity: 0;

            transform:
              translate(-50%,-70px)
              scale(.46);
          }
        }


        @keyframes gnaReverseMid {

          0% {
            opacity: 0;

            transform:
              translate(-50%,35px)
              scale(.86);
          }

          20% {
            opacity: .46;

            transform:
              translate(-50%,8px)
              scale(.90);
          }

          48% {
            opacity: .32;

            transform:
              translate(-50%,-18px)
              scale(.72);
          }

          72% {
            opacity: .16;

            transform:
              translate(-50%,-42px)
              scale(.54);
          }

          100% {
            opacity: 0;

            transform:
              translate(-50%,-68px)
              scale(.38);
          }
        }


        @keyframes gnaReverseSmall {

          0% {
            opacity: 0;

            transform:
              translate(-50%,24px)
              scale(.80);
          }

          22% {
            opacity: .32;

            transform:
              translate(-50%,0)
              scale(.70);
          }

          52% {
            opacity: .22;

            transform:
              translate(-50%,-24px)
              scale(.50);
          }

          78% {
            opacity: .09;

            transform:
              translate(-50%,-47px)
              scale(.36);
          }

          100% {
            opacity: 0;

            transform:
              translate(-50%,-70px)
              scale(.24);
          }
        }


        /* ==================================================
           RESPONSIVE
        ================================================== */


        .history {
          margin-top: 26px;
          padding: 18px;
          border-radius: 18px;
          background: #0A1117;
          border: 1px solid #233640;
        }

        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .history-title {
          margin: 0;
          color: #D8F4FA;
          font-size: 16px;
          font-weight: 800;
        }

        .history-count {
          color: #6FAFC4;
          font-size: 12px;
        }

        .history-reset {
          padding: 9px 12px;
          border-radius: 9px;
          background: #101A21;
          border: 1px solid #314A57;
          color: #B9E9F4;
          font-size: 12px;
          font-weight: 700;
        }

        .history-reset:hover { filter: brightness(1.08); }
        .history-reset:disabled { opacity: .45; cursor: not-allowed; }
        .history-list { display: grid; gap: 8px; }
        .history-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          min-height: 48px;
          padding: 9px 11px;
          border-radius: 10px;
          background: #071017;
          border: 1px solid #1D303A;
        }
        .history-number {
          color: #5FDFFF;
          font-size: 12px;
          font-weight: 800;
        }
        .history-values {
          min-width: 0;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
          color: #E9FCFF;
          font-size: 14px;
          font-weight: 650;
        }
        .history-meta {
          color: #7395A1;
          font-size: 11px;
          white-space: nowrap;
        }
        .history-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .history-page {
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          border-radius: 8px;
          background: #0B161D;
          border: 1px solid #233640;
          color: #9AC6D2;
          font-size: 12px;
        }
        .history-page.active {
          background: #008CFF;
          border-color: #19D9FF;
          color: #fff;
        }
        .history-empty {
          padding: 18px 8px;
          text-align: center;
          color: #66808A;
          font-size: 13px;
        }

        @media (max-width: 700px) {
          .history { padding: 14px; }
          .history-header { align-items: flex-start; }
          .history-item { grid-template-columns: minmax(0, 1fr) auto; }
          .history-values { font-size: 13px; }
        }

        @media (max-width: 900px) {
          .generator-card { width: min(760px, 100%); }
          .config { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 700px) {

          .app {
            padding:
              20px 12px;
          }

          .generator-card {
            padding: 20px;
          }

          .config {
            grid-template-columns: 1fr;
          }

          .check-container {
            grid-column: auto;
          }

          .header h1 {
            font-size: 38px;
          }

          .header p {
            font-size: 15px;
          }

          .gna-result {
            width:
              min(360px, 100%);
          }
        }

      `}</style>


      {/* ==================================================
          APLICACIÓN
      ================================================== */}

      <main className="app">

        <section className="generator-card">


          {/* HEADER */}

          <header className="header">

            <h1>
              GNR
            </h1>


          </header>


          {/* CONFIGURACIÓN */}

          <section className="config">

            <div className="field">

              <label>
                DESDE
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={min}
                onChange={(event) =>
                  setMin(
                    sanitizeInput(
                      event.target.value,
                      true
                    )
                  )
                }
              />

            </div>


            <div className="field">

              <label>
                HASTA
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={max}
                onChange={(event) =>
                  setMax(
                    sanitizeInput(
                      event.target.value,
                      true
                    )
                  )
                }
              />

            </div>


            <div className="field">

              <label>
                CANTIDAD
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={qty}
                onChange={(event) =>
                  setQty(
                    sanitizeInput(
                      event.target.value,
                      false
                    )
                  )
                }
              />

            </div>


            <label className="check-container">

              <input
                type="checkbox"
                checked={noRepeat}
                onChange={(event) =>
                  setNoRepeat(
                    event.target.checked
                  )
                }
              />

              <span>
                No repetir números
              </span>

            </label>

          </section>


          {/* ERROR */}

          {error && (

            <div className="message">
              {error}
            </div>

          )}


          {/* BOTÓN */}

          <button
            className="generate-button"
            onClick={generate}
          >
            ⚡ Generar
          </button>


          {/* ==================================================
              VISOR
          ================================================== */}

          <div className="result-wrapper">

            <div
              className={
                `gna-result ${
                  isGenerating
                    ? 'boost'
                    : ''
                }`
              }
              aria-label="Resultado del generador"
            >


              {/* GAUGE */}

              <div className="gna-gauge">

                <div className="gna-liquid"></div>

                <div className="gna-waterline"></div>

              </div>


              {/* GLOW */}

              <div className="gna-inner-glow"></div>


              {/* HUD CENTRAL */}

              <div className="gna-hud">

                <div>

                  {/* RESULTADO NORMAL */}

                  <div
                    className={
                      `gna-number ${
                        compact
                          ? 'compact'
                          : ''
                      } ${resultDensity} ${
                        tooManyDigits
                          ? 'hidden'
                          : ''
                      }`
                    }
                    aria-live="polite"
                  >
                    {displayedResult}
                  </div>


                  {/* ==================================================
                      5+ DÍGITOS → 3 FLECHAS HACIA ABAJO
                  ================================================== */}

                  {tooManyDigits && (

                    <div
                      className="gna-more visible"
                      title="Ver generación completa"
                    >

                      <span className="gna-more-arrows">

                        <span
                          className="gna-more-arrow"
                        ></span>

                        <span
                          className="gna-more-arrow"
                        ></span>

                        <span
                          className="gna-more-arrow"
                        ></span>

                      </span>

                    </div>

                  )}

                </div>

              </div>


              {/* ==================================================
                  CHEVRONES DEL EFECTO
              ================================================== */}

              <div
                className="gna-chevrons"
                aria-hidden="true"
              >

                {/* PEQUEÑOS */}

                <div className="gna-chev gna-s1">
                  <Chevron />
                </div>

                <div className="gna-chev gna-s2">
                  <Chevron />
                </div>

                <div className="gna-chev gna-s3">
                  <Chevron />
                </div>

                <div className="gna-chev gna-s4">
                  <Chevron />
                </div>

                <div className="gna-chev gna-s5">
                  <Chevron />
                </div>

                <div className="gna-chev gna-s6">
                  <Chevron />
                </div>

                <div className="gna-chev gna-s7">
                  <Chevron />
                </div>


                {/* MEDIANOS */}

                <div className="gna-chev gna-m1">
                  <Chevron />
                </div>

                <div className="gna-chev gna-m2">
                  <Chevron />
                </div>

                <div className="gna-chev gna-m3">
                  <Chevron />
                </div>

                <div className="gna-chev gna-m4">
                  <Chevron />
                </div>


                {/* GRANDES */}

                <div className="gna-chev gna-l1">
                  <Chevron />
                </div>

                <div className="gna-chev gna-l2">
                  <Chevron />
                </div>

                <div className="gna-chev gna-hero">
                  <Chevron />
                </div>


                {/* RETORNO MEDIANO */}

                <div className="gna-chev gna-rm1">
                  <Chevron />
                </div>

                <div className="gna-chev gna-rm2">
                  <Chevron />
                </div>

                <div className="gna-chev gna-rm3">
                  <Chevron />
                </div>


                {/* RETORNO PEQUEÑO */}

                <div className="gna-chev gna-rs1">
                  <Chevron />
                </div>

                <div className="gna-chev gna-rs2">
                  <Chevron />
                </div>

                <div className="gna-chev gna-rs3">
                  <Chevron />
                </div>

                <div className="gna-chev gna-rs4">
                  <Chevron />
                </div>

                <div className="gna-chev gna-rs5">
                  <Chevron />
                </div>

                <div className="gna-chev gna-rs6">
                  <Chevron />
                </div>

              </div>


              {/* PUNTO CENTRAL */}

              <div className="gna-center"></div>

            </div>

          </div>

          {/* ==================================================
              HISTORIAL
          ================================================== */}

          <section className="history">
            <div className="history-header">
              <div>
                <h2 className="history-title">Historial</h2>
                <div className="history-count">
                  {history.length} / {HISTORY_LIMIT} generaciones
                </div>
              </div>

              <button
                type="button"
                className="history-reset"
                onClick={resetHistory}
                disabled={!history.length}
              >
                ↺ Resetear
              </button>
            </div>

            {visibleHistory.length ? (
              <>
                <div className="history-list">
                  {visibleHistory.map((entry, index) => (
                    <div className="history-item" key={entry.id}>
                      <div className="history-values" title={entry.values.join(' · ')}>
                        {entry.values.join(' · ')}
                      </div>

                      <div className="history-meta">
                        {formatGenerationTime(entry.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="history-pagination" aria-label="Paginación del historial">
                  {Array.from({ length: historyPageCount }, (_, index) => index + 1).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={`history-page ${page === safeHistoryPage ? 'active' : ''}`}
                      onClick={() => setHistoryPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="history-empty">Todavía no hay generaciones guardadas.</div>
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