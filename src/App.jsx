import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, useGLTF, useTexture } from '@react-three/drei'
import { ASSET_CONFIG } from './config/assets'
import Player from './components/Player'
import Follower from './components/Follower'
import GameUI from './components/GameUI'
import Village from './components/Village'
import { generateSpawnPositions } from './systems/spawnSystem'
import { generateInitialMap } from './systems/mapSystem'

const createGameSetup = () => {
  const spawn = generateSpawnPositions()
  return {
    spawn,
    playerPos: spawn.playerPos.clone(),
    items: generateInitialMap(spawn.playerPos, spawn.pikachuPos),
    startedAt: Date.now(),
  }
}

export default function App() {
  const [gameSetup, setGameSetup] = useState(createGameSetup);
  const spawnRef = useRef(gameSetup.spawn);
  const playerPosRef = useRef(gameSetup.playerPos);

  const [items, setItems] = useState(gameSetup.items);
  
  const [gameState, setGameState] = useState('playing'); 
  const timeRef = useRef({ accumulated: 0, lastResume: gameSetup.startedAt });
  const [finalTimeStr, setFinalTimeStr] = useState('');
  const [startTime, setStartTime] = useState(gameSetup.startedAt);

  const bgmRef = useRef(new Audio('/bgm1.mp3'));

  useEffect(() => {
    bgmRef.current.loop = true; 
    bgmRef.current.volume = 0.3; 
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      bgmRef.current.play().catch(() => {
        console.log('자동재생 차단. 클릭/키 입력 시 재생됩니다.');
      });
    } else {
      bgmRef.current.pause();
    }
  }, [gameState]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (gameState === 'playing' && bgmRef.current.paused) {
        bgmRef.current.play();
      }
    };
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('click', handleFirstInteraction);
    return () => {
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };
  }, [gameState]);

  const togglePause = () => {
    setGameState((prev) => {
      if (prev === 'playing') {
        timeRef.current.accumulated += Date.now() - timeRef.current.lastResume;
        return 'paused';
      } else if (prev === 'paused') {
        timeRef.current.lastResume = Date.now();
        return 'playing';
      }
      return prev;
    });
  };

  useEffect(() => {
    const handleBlur = () => {
      setGameState((prev) => {
        if (prev === 'playing') {
          timeRef.current.accumulated += Date.now() - timeRef.current.lastResume;
          return 'paused';
        }
        return prev;
      });
    };
    
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', () => { if (document.hidden) handleBlur() });
    
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
    };
  }, []);

  // 🌟 [핵심 변경 5] 다시 도전 시 새로운 랜덤 스폰 위치를 다시 뽑아냅니다.
  const handleRetry = () => {
    const newSetup = createGameSetup();
    spawnRef.current = newSetup.spawn;
    
    playerPosRef.current.copy(newSetup.spawn.playerPos); 
    setItems(newSetup.items); 
    setGameSetup(newSetup);
    
    timeRef.current = { accumulated: 0, lastResume: newSetup.startedAt }; 
    setFinalTimeStr('');
    setStartTime(newSetup.startedAt); 
    setGameState('playing'); 
    bgmRef.current.currentTime = 0; 
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#87CEEB', position: 'relative', overflow: 'hidden' }}>
      
      <GameUI 
        timeRef={timeRef} 
        gameState={gameState} 
        finalTimeStr={finalTimeStr} 
        onRetry={handleRetry} 
        onTogglePause={togglePause}
      />

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 20, 30]} fov={40} far={2000} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[15, 30, 10]} intensity={1.5} />
        <Suspense fallback={null}>
          <Player key={`player-${startTime}`} items={items} playerPosRef={playerPosRef} gameState={gameState}/>
          <Follower 
            key={`follower-${startTime}`} 
            playerPosRef={playerPosRef} 
            initialPosition={gameSetup.spawn.pikachuPos}
            items={items} 
            gameState={gameState} 
            setGameState={setGameState} 
            setFinalTimeStr={setFinalTimeStr} 
            timeRef={timeRef} 
          />
        </Suspense>
        <Village items={items} />
      </Canvas>
    </div>
  )
}

Object.keys(ASSET_CONFIG).forEach((type) => { useGLTF.preload(`/models/${type}/scene.gltf`) })
useGLTF.preload('/models/Metamong/scene.gltf')
useGLTF.preload('/models/Pikachu/scene.gltf') 
useTexture.preload('/grass.jpg')
