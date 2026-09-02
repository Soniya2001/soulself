import React, { useMemo } from "react";

interface PetalItem {
  id: number;
  left: number; // 0 - 100%
  size: number; // px
  duration: number; // s
  delay: number; // s
  swayAmount: number; // px
  rotationStart: number;
  rotationEnd: number;
  opacity: number;
  blur: number; // px
  colorType: number; // 0, 1, 2
}

export const PetalsCanvas: React.FC<{ count?: number; interactive?: boolean }> = ({
  count = 28,
  interactive = false,
}) => {
  const petals = useMemo<PetalItem[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 14 + Math.random() * 26,
      duration: 7 + Math.random() * 10,
      delay: Math.random() * 8,
      swayAmount: 25 + Math.random() * 50,
      rotationStart: Math.random() * 360,
      rotationEnd: Math.random() * 720 - 360,
      opacity: 0.45 + Math.random() * 0.45,
      blur: Math.random() > 0.7 ? Math.random() * 2.5 : 0,
      colorType: Math.floor(Math.random() * 3),
    }));
  }, [count]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-20 ${
        interactive ? "pointer-events-auto" : ""
      }`}
      aria-hidden="true"
    >
      {petals.map((p) => {
        const fillGradients = [
          "linear-gradient(135deg, #FFB6C1 0%, #FF69B4 60%, #E066FF 100%)",
          "linear-gradient(135deg, #FFC0CB 0%, #F472B6 70%, #C084FC 100%)",
          "linear-gradient(135deg, #FDF2F8 0%, #F9A8D4 50%, #EC4899 100%)",
        ];

        return (
          <div
            key={p.id}
            className="absolute -top-12"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.35}px`,
              animation: `petalFloat ${p.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`,
              animationDelay: `${p.delay}s`,
              opacity: p.opacity,
              filter: p.blur > 0 ? `blur(${p.blur}px)` : "none",
            }}
          >
            <svg
              viewBox="0 0 30 40"
              className="w-full h-full drop-shadow-sm transition-transform duration-700 hover:scale-125"
              style={{
                transform: `rotate(${p.rotationStart}deg)`,
              }}
            >
              <defs>
                <linearGradient id={`petalGrad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF0F5" />
                  <stop offset="40%" stopColor={p.colorType === 0 ? "#F472B6" : "#FB7185"} />
                  <stop offset="100%" stopColor={p.colorType === 2 ? "#C084FC" : "#E879F9"} />
                </linearGradient>
                <filter id={`shadow-${p.id}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#DB2777" floodOpacity="0.15" />
                </filter>
              </defs>
              {/* Natural organic curved petal path */}
              <path
                d="M15,2 C24,8 29,20 22,32 C17,39 12,38 7,32 C1,22 5,8 15,2 Z"
                fill={`url(#petalGrad-${p.id})`}
                filter={`url(#shadow-${p.id})`}
                opacity="0.95"
              />
              {/* Petal center vein */}
              <path
                d="M15,5 Q16,22 15,35"
                stroke="rgba(255, 255, 255, 0.6)"
                strokeWidth="0.75"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};
