/**
 * Loading Cup Animation Component
 * Анимация загрузки - вращающийся стакан с переливающейся жидкостью
 * 
 * По ТЗ: стакан вращается по круговой траектории, в верхней точке
 * содержимое "выливается", затем стакан перемещается вниз и снова "наливается"
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingCupProps {
  isLoading?: boolean;
  text?: string;
  fullScreen?: boolean;
}

export const LoadingCup: React.FC<LoadingCupProps> = ({ 
  isLoading = true, 
  text = 'Загрузка...',
  fullScreen = true 
}) => {
  if (!isLoading) return null;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`${
            fullScreen 
              ? 'fixed inset-0 z-[9999] bg-gradient-to-br from-[#1A0A10] via-[#2D0F1A] to-[#4A1A2C]' 
              : 'w-full h-full min-h-[200px] bg-transparent'
          } flex flex-col items-center justify-center`}
        >
          {/* Контейнер анимации */}
          <div className="relative w-64 h-64">
            {/* Круговая траектория (видимая дорожка) */}
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
            
            {/* Вращающийся контейнер со стаканом */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              {/* Стакан на орбите */}
              <motion.div 
                className="absolute -top-8 left-1/2 -translate-x-1/2"
                animate={{ 
                  rotateZ: [0, -45, 0, 45, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* SVG стакан с жидкостью */}
                <svg width="80" height="100" viewBox="0 0 80 100" className="drop-shadow-2xl">
                  {/* Тень стакана */}
                  <defs>
                    <linearGradient id="cupGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="coffeeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8B4513" />
                      <stop offset="50%" stopColor="#5D3A1A" />
                      <stop offset="100%" stopColor="#3D2614" />
                    </linearGradient>
                    <linearGradient id="creamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFF8DC" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                    <clipPath id="cupClip">
                      <path d="M15 20 L65 20 L58 85 Q58 92 50 92 L30 92 Q22 92 22 85 Z" />
                    </clipPath>
                  </defs>
                  
                  {/* Корпус стакана */}
                  <path 
                    d="M12 15 L68 15 L60 88 Q60 95 50 95 L30 95 Q20 95 20 88 Z" 
                    fill="url(#cupGradient)"
                    stroke="#D4AF37"
                    strokeWidth="2"
                  />
                  
                  {/* Кофе внутри с анимацией уровня */}
                  <g clipPath="url(#cupClip)">
                    <motion.rect
                      x="15"
                      y="30"
                      width="50"
                      height="65"
                      fill="url(#coffeeGradient)"
                      animate={{
                        y: [30, 60, 30],
                        height: [65, 20, 65]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    {/* Пенка/крема */}
                    <motion.ellipse
                      cx="40"
                      cy="32"
                      rx="22"
                      ry="6"
                      fill="url(#creamGradient)"
                      animate={{
                        cy: [32, 62, 32],
                        opacity: [1, 0.3, 1]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </g>
                  
                  {/* Крышка стакана */}
                  <ellipse cx="40" cy="15" rx="28" ry="6" fill="#2D2D2D" />
                  <ellipse cx="40" cy="14" rx="24" ry="4" fill="#1A1A1A" />
                  
                  {/* Отверстие в крышке */}
                  <ellipse cx="40" cy="14" rx="8" ry="2" fill="#3D2614" />
                  
                  {/* Блики */}
                  <path 
                    d="M25 25 Q23 50 27 75" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="3" 
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Капли, выливающиеся из стакана */}
                <motion.div
                  className="absolute top-12 left-1/2 -translate-x-1/2"
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [0, 10, 30, 50],
                    scale: [0.8, 1, 0.6, 0.3]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    times: [0, 0.25, 0.5, 0.75],
                    ease: "easeOut"
                  }}
                >
                  <div className="w-3 h-4 bg-gradient-to-b from-amber-700 to-amber-900 rounded-full opacity-80" />
                </motion.div>
                
                {/* Дополнительные капли */}
                <motion.div
                  className="absolute top-14 left-8"
                  animate={{
                    opacity: [0, 0.8, 0.8, 0],
                    y: [0, 15, 35, 55],
                    x: [-5, -10, -15, -20]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: 0.2,
                    ease: "easeOut"
                  }}
                >
                  <div className="w-2 h-3 bg-gradient-to-b from-amber-700 to-amber-900 rounded-full opacity-60" />
                </motion.div>
              </motion.div>
            </motion.div>
            
            {/* Логотип в центре */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-4xl"
              >
                ☕
              </motion.div>
            </div>
            
            {/* Частицы пара */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2"
                animate={{
                  y: [-20, -60],
                  x: [0, (i - 2) * 15],
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1.2]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut"
                }}
              >
                <div className="w-2 h-2 bg-white/30 rounded-full blur-sm" />
              </motion.div>
            ))}
          </div>
          
          {/* Текст загрузки */}
          <motion.p
            className="mt-8 text-amber-200/80 text-lg font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
          
          {/* Прогресс бар */}
          <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ width: '50%' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingCup;
