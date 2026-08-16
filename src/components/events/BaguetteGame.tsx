'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [{ x: 7, y: 7 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const INITIAL_SPEED = 200;

export default function BaguetteGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 10, y: 5 });
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const generateFood = useCallback((currentSnake: { x: number, y: number }[]) => {
    let newFood: { x: number, y: number };
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Make sure food is not on snake
      // eslint-disable-next-line no-loop-func
      const collision = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!collision) break;
    }
    return newFood;
  }, []);

  const handleStart = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setLives(3);
    setSpeed(INITIAL_SPEED);
    setFood(generateFood(INITIAL_SNAKE));
    setGameOver(false);
    setIsPlaying(true);
  };

  const handleDeath = (currentLives: number) => {
    if (currentLives > 1) {
      setLives(currentLives - 1);
      setSnake(INITIAL_SNAKE);
      setDirection(INITIAL_DIRECTION);
    } else {
      setLives(0);
      setGameOver(true);
      setIsPlaying(false);
    }
  };

  const moveSnake = useCallback(() => {
    if (gameOver || !isPlaying) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
      };

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        handleDeath(lives);
        return prevSnake; // state update handled in handleDeath, but we return old to not crash
      }

      // Check self collision
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        handleDeath(lives);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 1);
        setFood(generateFood(newSnake));
        setSpeed((s) => Math.max(80, s - 5)); // Increase speed slightly
      } else {
        newSnake.pop(); // Remove tail if no food eaten
      }

      return newSnake;
    });
  // Keep handleDeath from causing dependency loops by using setLives callback if possible, 
  // but it's simpler to just omit the dependency if we use functional updates. 
  // Since we rely on `lives` inside useCallback, we must add it to the dependency array of moveSnake.
  // We'll let React handle it as we add `lives` to the deps.

  }, [direction, food, gameOver, isPlaying, generateFood, lives]); // <-- Added lives

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(moveSnake, speed);
      return () => clearInterval(interval);
    }
  }, [moveSnake, isPlaying, speed]);

  const handleControlClick = (dx: number, dy: number) => {
    if (!isPlaying) return;
    if (dx !== 0 && direction.x !== -dx) setDirection({ x: dx, y: 0 });
    if (dy !== 0 && direction.y !== -dy) setDirection({ x: 0, y: dy });
  };

  return (
    <div style={{ background: '#fdfaf6', borderRadius: '1.5rem', border: '1px solid rgba(0,0,0,0.05)', padding: '2rem', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#e85d04', margin: '0 0 0.5rem 0' }}>Baguette Snake</h3>
      <p style={{ color: '#6a4a3a', marginBottom: '1rem', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 1rem', fontWeight: 500 }}>
        Allunga la baguette mangiando più ripieno possibile senza sbattere! Usa i tasti a schermo o le frecce della tastiera.
      </p>

      {/* Score and Lives */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', maxWidth: '400px', margin: '0 auto 1rem' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2a150a' }}>
          Lunghezza: {score} m
        </div>
        <div style={{ fontSize: '1.2rem' }}>
          Vite: {'❤️'.repeat(lives)}{'🤍'.repeat(3 - lives)}
        </div>
      </div>

      {/* Game Board */}
      <div style={{ 
        margin: '0 auto',
        width: 'fit-content',
        background: '#f4ede1',
        border: '4px solid #d1c0a8',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: '1px',
        padding: '2px',
        position: 'relative'
      }}>
        
        {!isPlaying && !gameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(253, 250, 246, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <button onClick={handleStart} style={{ padding: '1rem 3rem', background: '#e85d04', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(232, 93, 4, 0.4)' }}>
              Gioca Ora
            </button>
          </div>
        )}

        {gameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(253, 250, 246, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💥</div>
            <h4 style={{ color: 'red', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>Game Over!</h4>
            <button onClick={handleStart} style={{ padding: '0.8rem 2rem', background: '#e85d04', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>
              Riprova
            </button>
          </div>
        )}

        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          
          const isSnake = snake.some((s) => s.x === x && s.y === y);
          const isFood = food.x === x && food.y === y;
          const isHead = snake[0].x === x && snake[0].y === y;

          return (
            <div 
              key={i} 
              style={{ 
                width: '18px', 
                height: '18px', 
                background: isHead ? '#b48530' : isSnake ? '#e6cc98' : 'transparent',
                borderRadius: isSnake ? '4px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}
            >
              {isFood ? '🥔' : ''}
            </div>
          );
        })}
      </div>

      {/* Mobile Controls */}
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <button onClick={() => handleControlClick(0, -1)} style={{ padding: '1rem', background: '#e85d04', color: 'white', border: 'none', borderRadius: '50%', touchAction: 'manipulation' }}>
          <ArrowUp size={24} />
        </button>
        <div style={{ display: 'flex', gap: '3rem' }}>
          <button onClick={() => handleControlClick(-1, 0)} style={{ padding: '1rem', background: '#e85d04', color: 'white', border: 'none', borderRadius: '50%', touchAction: 'manipulation' }}>
            <ArrowLeft size={24} />
          </button>
          <button onClick={() => handleControlClick(1, 0)} style={{ padding: '1rem', background: '#e85d04', color: 'white', border: 'none', borderRadius: '50%', touchAction: 'manipulation' }}>
            <ArrowRight size={24} />
          </button>
        </div>
        <button onClick={() => handleControlClick(0, 1)} style={{ padding: '1rem', background: '#e85d04', color: 'white', border: 'none', borderRadius: '50%', touchAction: 'manipulation' }}>
          <ArrowDown size={24} />
        </button>
      </div>

    </div>
  );
}
