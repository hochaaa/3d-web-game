import { useEffect, useState } from 'react'

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${seconds < 10 ? '0' + seconds : seconds}초`
}

export default function GameUI({ timeRef, gameState, finalTimeStr, onRetry, onTogglePause }) {
  const [displayTime, setDisplayTime] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      if (gameState === 'playing') {
        setDisplayTime(timeRef.current.accumulated + (Date.now() - timeRef.current.lastResume))
      } else {
        setDisplayTime(timeRef.current.accumulated)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [gameState, timeRef])

  const textStyle = {
    fontFamily: "'CustomGameFont', sans-serif",
    color: 'white',
    textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
    userSelect: 'none',
  }

  return (
    <>
      <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '24px', ...textStyle }}>
          ⏱ 생존 시간: {formatTime(displayTime)}
        </div>

        {gameState !== 'gameover' && (
          <button onClick={onTogglePause} style={{
            padding: '10px 20px', fontSize: '20px', ...textStyle,
            backgroundColor: gameState === 'playing' ? '#ff9800' : '#4caf50',
            border: '3px solid white', cursor: 'pointer', borderRadius: '10px',
          }}>
            {gameState === 'playing' ? '⏸ 일시정지' : '▶️ 계속하기'}
          </button>
        )}
      </div>

      {gameState === 'paused' && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '60px', color: '#fff', ...textStyle, marginBottom: '30px' }}>PAUSED</div>
          <button onClick={onTogglePause} style={{ padding: '15px 40px', fontSize: '24px', ...textStyle, backgroundColor: '#4caf50', border: '3px solid white', cursor: 'pointer', borderRadius: '10px' }}>
            다시 달리기!
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
          <div style={{ fontSize: '80px', color: '#ffcc00', ...textStyle }}>GAME OVER</div>
          <div style={{ fontSize: '32px', textAlign: 'center', lineHeight: '1.5', ...textStyle }}>거대 피카츄에게 잡혔습니다! ⚡️<br />기록: <span style={{ color: '#ff4444' }}>{finalTimeStr}</span></div>
          <button onClick={onRetry} style={{ padding: '20px 60px', fontSize: '30px', ...textStyle, backgroundColor: '#333', border: '4px solid white', cursor: 'pointer', borderRadius: '15px' }}>다시 도전하기</button>
        </div>
      )}
    </>
  )
}

