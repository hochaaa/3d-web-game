import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, useGLTF, Clone, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// 🎨 아이템 설정 
const ASSET_CONFIG = {
  Tree1: { name: '🌳 나무 1', scale: 7, isPrimitive: true }, 
  Tree2: { name: '🌲 나무 2', scale: 8, isPrimitive: true }
}

// 🎲 [핵심 추가 1] 무작위 스폰 위치 계산기 (메타몽과 피카츄의 거리 조절)
const MIN_SPAWN_DIST = 40; // 피카츄와의 최소 거리 (너무 가까이서 시작하면 억울하니까요!)
const MAX_SPAWN_DIST = 80; // 피카츄와의 최대 거리
const MAP_LIMIT = 180; // 맵 끝자락(200)에 낑겨서 스폰되는 걸 방지하는 여백

const generateSpawnPositions = () => {
  // 1. 메타몽(플레이어)의 무작위 위치 생성
  const px = Math.floor(Math.random() * (MAP_LIMIT * 2)) - MAP_LIMIT;
  const pz = Math.floor(Math.random() * (MAP_LIMIT * 2)) - MAP_LIMIT;
  const playerPos = new THREE.Vector3(px, 0, pz);

  let ex, ez;
  let valid = false;

  // 2. 피카츄의 무작위 위치 생성 (메타몽과의 거리 규칙을 지킬 때까지 반복 계산)
  while (!valid) {
    const angle = Math.random() * Math.PI * 2; // 360도 무작위 방향
    // 최소 거리와 최대 거리 사이에서 무작위 거리 뽑기
    const distance = Math.floor(Math.random() * (MAX_SPAWN_DIST - MIN_SPAWN_DIST + 1)) + MIN_SPAWN_DIST;
    
    ex = px + Math.cos(angle) * distance;
    ez = pz + Math.sin(angle) * distance;
    
    // 계산된 피카츄 위치가 맵 밖으로 나가지 않았는지 검사
    if (ex >= -MAP_LIMIT && ex <= MAP_LIMIT && ez >= -MAP_LIMIT && ez <= MAP_LIMIT) {
      valid = true;
    }
  }
  const pikachuPos = new THREE.Vector3(ex, 0, ez);
  return { playerPos, pikachuPos };
};

// 🌲 나무 배치 시스템 (매번 바뀌는 스폰 위치를 전달받아서 안전지대를 만듭니다)
const generateInitialMap = (playerPos, pikachuPos) => {
  const initialItems = []
  const naturalTypes = ['Tree1', 'Tree2']
  const MIN_TREE_DISTANCE = 15 
  let attempts = 0

  while (initialItems.length < 400 && attempts < 5000) {
    attempts++
    const randomType = naturalTypes[Math.floor(Math.random() * naturalTypes.length)]
    const randomX = Math.floor(Math.random() * 400) - 200
    const randomZ = Math.floor(Math.random() * 400) - 200

    let isTooClose = false

    // 🌟 [핵심 변경 2] 고정 좌표가 아닌, 무작위로 결정된 스폰 위치 주변을 안전지대로 설정합니다.
    const distToPlayer = Math.sqrt(Math.pow(randomX - playerPos.x, 2) + Math.pow(randomZ - playerPos.z, 2))
    const distToPikachu = Math.sqrt(Math.pow(randomX - pikachuPos.x, 2) + Math.pow(randomZ - pikachuPos.z, 2))
    
    // 안전 반경 확보!
    if (distToPlayer < 12 || distToPikachu < 15) continue; 

    for (let item of initialItems) {
      const dx = item.position[0] - randomX
      const dz = item.position[2] - randomZ
      if (Math.sqrt(dx * dx + dz * dz) < MIN_TREE_DISTANCE) {
        isTooClose = true
        break
      }
    }

    if (!isTooClose) {
      initialItems.push({ id: `init_${initialItems.length}`, position: [randomX, 0, randomZ], type: randomType })
    }
  }
  return initialItems
}

function Player({ items, playerPosRef, gameState }) {
  const { scene } = useGLTF('/models/Metamong/scene.gltf')
  const playerRef = useRef()
  const modelRef = useRef() 
  
  const pos = playerPosRef; 
  const targetQuaternion = useRef(new THREE.Quaternion())
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const TREE_COLLISION_DISTANCE = 2.0; 

  useLayoutEffect(() => {
    if (modelRef.current) modelRef.current.traverse((obj) => { if (obj.isMesh) obj.frustumCulled = false })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyW' || e.key === 'ArrowUp') keys.current.w = true
      if (e.code === 'KeyA' || e.key === 'ArrowLeft') keys.current.a = true
      if (e.code === 'KeyS' || e.key === 'ArrowDown') keys.current.s = true
      if (e.code === 'KeyD' || e.key === 'ArrowRight') keys.current.d = true
    }
    const handleKeyUp = (e) => {
      if (e.code === 'KeyW' || e.key === 'ArrowUp') keys.current.w = false
      if (e.code === 'KeyA' || e.key === 'ArrowLeft') keys.current.a = false
      if (e.code === 'KeyS' || e.key === 'ArrowDown') keys.current.s = false
      if (e.code === 'KeyD' || e.key === 'ArrowRight') keys.current.d = false
    }
    const handleBlur = () => { keys.current = { w: false, a: false, s: false, d: false } }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useFrame((state) => {
    if (!playerRef.current || !modelRef.current || gameState !== 'playing') return

    const speed = 0.2
    let isMoving = false
    const direction = new THREE.Vector3()

    if (keys.current.w) { direction.z -= 1; isMoving = true }
    if (keys.current.s) { direction.z += 1; isMoving = true }
    if (keys.current.a) { direction.x -= 1; isMoving = true }
    if (keys.current.d) { direction.x += 1; isMoving = true }

    if (isMoving) {
      direction.normalize().multiplyScalar(speed)
      const nextX = pos.current.x + direction.x
      const nextZ = pos.current.z + direction.z

      let isColliding = false
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const currentDx = pos.current.x - item.position[0]
        const currentDz = pos.current.z - item.position[2]
        const currentDist = Math.sqrt(currentDx * currentDx + currentDz * currentDz)

        const dx = nextX - item.position[0]
        const dz = nextZ - item.position[2]
        const nextDist = Math.sqrt(dx * dx + dz * dz)
        
        if (nextDist < TREE_COLLISION_DISTANCE && nextDist < currentDist) {
          isColliding = true
          break
        }
      }

      if (!isColliding) {
        pos.current.x = nextX
        pos.current.z = nextZ
      }
      
      const angle = Math.atan2(direction.x, direction.z)
      targetQuaternion.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      modelRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.03
    } else {
      modelRef.current.rotation.z = THREE.MathUtils.lerp(modelRef.current.rotation.z, 0, 0.1)
    }

    playerRef.current.position.copy(pos.current)
    playerRef.current.quaternion.slerp(targetQuaternion.current, 0.15)

    const cameraOffset = new THREE.Vector3(pos.current.x, pos.current.y + 15, pos.current.z + 20)
    state.camera.position.lerp(cameraOffset, 0.05)
    state.camera.lookAt(pos.current.x, pos.current.y + 4, pos.current.z)
  })

  return (
    <group ref={playerRef}>
      <group ref={modelRef}>
        <primitive object={scene} scale={4} />
      </group>
    </group>
  )
}

// ⚡️ 피카츄 초기 위치 전달받기
function Follower({ playerPosRef, initialPosition, items, gameState, setGameState, setFinalTimeStr, timeRef }) {
  const { scene } = useGLTF('/models/Pikachu/scene.gltf')
  const chaserRef = useRef()
  const modelRef = useRef()
  // 🌟 [핵심 변경 3] 이제 하드코딩된 위치가 아니라 전달받은 랜덤 위치에서 시작합니다.
  const pos = useRef(initialPosition.clone()) 
  const chaserTargetQuaternion = useRef(new THREE.Quaternion())

  const CHASER_SPEED = 0.202; 
  const PLAYER_CATCH_DISTANCE = 4.0; 
  const TREE_AVOIDANCE_DISTANCE = 6.0; 

  useLayoutEffect(() => {
    if (modelRef.current) modelRef.current.traverse((obj) => { if (obj.isMesh) obj.frustumCulled = false })
  }, [])

  useFrame((state) => {
    if (!chaserRef.current || !modelRef.current || gameState !== 'playing') return;

    const playerPos = playerPosRef.current;
    const followerPos = pos.current;
    
    const desiredDirection = new THREE.Vector3().subVectors(playerPos, followerPos);
    const distanceToPlayer = desiredDirection.length();

    if (distanceToPlayer < PLAYER_CATCH_DISTANCE) {
      const totalMs = timeRef.current.accumulated + (Date.now() - timeRef.current.lastResume);
      const minutes = Math.floor((totalMs / 1000) / 60);
      const seconds = Math.floor((totalMs / 1000) % 60);
      
      setFinalTimeStr(`${minutes}분 ${seconds}초`);
      setGameState('gameover');
      return; 
    }

    if (distanceToPlayer > 1.0) {
      desiredDirection.normalize(); 
      let moveDir = desiredDirection.clone();
      let foundPath = false;

      const anglesToTry = [
        0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, 
        Math.PI / 2, -Math.PI / 2, Math.PI / 1.5, -Math.PI / 1.5, Math.PI, -Math.PI
      ];

      for (let angle of anglesToTry) {
        const testDir = desiredDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        const nextX = followerPos.x + testDir.x * CHASER_SPEED;
        const nextZ = followerPos.z + testDir.z * CHASER_SPEED;

        let isColliding = false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const currentDx = followerPos.x - item.position[0];
          const currentDz = followerPos.z - item.position[2];
          const currentDist = Math.sqrt(currentDx * currentDx + currentDz * currentDz);

          const dx = nextX - item.position[0];
          const dz = nextZ - item.position[2];
          const nextDist = Math.sqrt(dx * dx + dz * dz);
          
          if (nextDist < TREE_AVOIDANCE_DISTANCE && nextDist < currentDist) {
            isColliding = true;
            break;
          }
        }

        if (!isColliding) {
          moveDir = testDir;
          foundPath = true;
          break; 
        }
      }

      if (foundPath) {
        followerPos.add(moveDir.multiplyScalar(CHASER_SPEED));
        const angleY = Math.atan2(moveDir.x, moveDir.z);
        chaserTargetQuaternion.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleY);
      }
    }

    chaserRef.current.position.copy(pos.current);
    chaserRef.current.quaternion.slerp(chaserTargetQuaternion.current, 0.1); 
    modelRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.05; 
  });

  return (
    <group ref={chaserRef}>
      <group ref={modelRef}>
        <primitive object={scene} scale={3} /> 
      </group>
    </group>
  );
}

function PlacedModel({ type }) {
  const config = ASSET_CONFIG[type]
  const groupRef = useRef() 
  if (!config) return null
  const { scene } = useGLTF(`/models/${type}/scene.gltf`)
  
  useLayoutEffect(() => {
    if (groupRef.current) groupRef.current.traverse((obj) => { if (obj.isMesh) obj.frustumCulled = false })
  }, [])

  return (
    <group ref={groupRef}>
      <Clone object={scene} scale={config.scale} position={[0, 0, 0]} />
    </group>
  )
}

function Ground() {
  const grassTexture = useTexture('/grass.jpg')
  useLayoutEffect(() => {
    if (grassTexture) {
      grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
      grassTexture.repeat.set(100, 100)
      grassTexture.needsUpdate = true
    }
  }, [grassTexture])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial map={grassTexture} />
      </mesh>
    </group>
  )
}

function Village({ items }) {
  return (
    <group>
      <React.Suspense fallback={null}><Ground /></React.Suspense>
      {items.map((item) => (
        <group key={item.id} position={item.position}>
          <React.Suspense fallback={null}><PlacedModel type={item.type} /></React.Suspense>
        </group>
      ))}
    </group>
  )
}

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds < 10 ? '0' + seconds : seconds}초`;
};

// 🖥 UI 담당 컴포넌트
function GameUI({ timeRef, gameState, finalTimeStr, onRetry, onTogglePause }) {
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (gameState === 'playing') {
        setDisplayTime(timeRef.current.accumulated + (Date.now() - timeRef.current.lastResume));
      } else {
        setDisplayTime(timeRef.current.accumulated); 
      }
    }, 100); 
    return () => clearInterval(timer);
  }, [gameState, timeRef]);

  const textStyle = { 
    fontFamily: "'CustomGameFont', sans-serif", 
    color: 'white', 
    textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000', 
    userSelect: 'none' 
  };
  
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
            border: '3px solid white', cursor: 'pointer', borderRadius: '10px'
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
          <div style={{ fontSize: '32px', textAlign: 'center', lineHeight: '1.5', ...textStyle }}>거대 피카츄에게 잡혔습니다! ⚡️<br/>기록: <span style={{color: '#ff4444'}}>{finalTimeStr}</span></div>
          <button onClick={onRetry} style={{ padding: '20px 60px', fontSize: '30px', ...textStyle, backgroundColor: '#333', border: '4px solid white', cursor: 'pointer', borderRadius: '15px' }}>다시 도전하기</button>
        </div>
      )}
    </>
  );
}

export default function App() {
  // 🌟 [핵심 변경 4] 게임 시작 시 최초 스폰 위치를 미리 계산합니다.
  const spawnRef = useRef(generateSpawnPositions());
  const playerPosRef = useRef(spawnRef.current.playerPos.clone());
  
  // 계산된 스폰 위치(안전지대 정보)를 맵 생성기에 넘겨줍니다.
  const [items, setItems] = useState(() => generateInitialMap(spawnRef.current.playerPos, spawnRef.current.pikachuPos));
  
  const [gameState, setGameState] = useState('playing'); 
  const timeRef = useRef({ accumulated: 0, lastResume: Date.now() });
  const [finalTimeStr, setFinalTimeStr] = useState('');
  const [startTime, setStartTime] = useState(Date.now());

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
    const newSpawns = generateSpawnPositions();
    spawnRef.current = newSpawns;
    
    playerPosRef.current.copy(newSpawns.playerPos); 
    setItems(generateInitialMap(newSpawns.playerPos, newSpawns.pikachuPos)); 
    
    timeRef.current = { accumulated: 0, lastResume: Date.now() }; 
    setFinalTimeStr('');
    setStartTime(Date.now()); 
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
        <React.Suspense fallback={null}>
          <Player key={`player-${startTime}`} items={items} playerPosRef={playerPosRef} gameState={gameState}/>
          {/* 🌟 [핵심 변경 6] 피카츄에게 랜덤으로 생성된 시작 좌표를 전달합니다. */}
          <Follower 
            key={`follower-${startTime}`} 
            playerPosRef={playerPosRef} 
            initialPosition={spawnRef.current.pikachuPos}
            items={items} 
            gameState={gameState} 
            setGameState={setGameState} 
            setFinalTimeStr={setFinalTimeStr} 
            timeRef={timeRef} 
          />
        </React.Suspense>
        <Village items={items} />
      </Canvas>
    </div>
  )
}

Object.keys(ASSET_CONFIG).forEach((type) => { useGLTF.preload(`/models/${type}/scene.gltf`) })
useGLTF.preload('/models/Metamong/scene.gltf')
useGLTF.preload('/models/Pikachu/scene.gltf') 
useTexture.preload('/grass.jpg')