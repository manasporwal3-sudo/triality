"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface FloatingItem {
  id: string;
  image: string;
  top: string;
  left: string;
  size: number;
  layer: 'back' | 'mid' | 'front';
  delay: string;
  duration: string;
  hint: string;
}

const floatingItems: FloatingItem[] = [
  // Background Layer (Deep, Blurred)
  { id: '1', image: 'hero-pizza', top: '10%', left: '15%', size: 180, layer: 'back', delay: '0s', duration: '14s', hint: 'pizza' },
  { id: '2', image: 'hero-thali', top: '65%', left: '10%', size: 220, layer: 'back', delay: '2s', duration: '16s', hint: 'indian thali' },
  { id: '3', image: 'hero-samosa', top: '40%', left: '80%', size: 140, layer: 'back', delay: '1s', duration: '12s', hint: 'samosa' },
  
  // Mid Layer (Standard)
  { id: '4', image: 'hero-burger', top: '20%', left: '75%', size: 160, layer: 'mid', delay: '3s', duration: '10s', hint: 'burger' },
  { id: '5', image: 'hero-dosa', top: '75%', left: '60%', size: 200, layer: 'mid', delay: '0.5s', duration: '13s', hint: 'dosa' },
  { id: '6', image: 'hero-samosa', top: '80%', left: '25%', size: 120, layer: 'mid', delay: '4s', duration: '11s', hint: 'samosa' },

  // Foreground Layer (Sharper, Faster)
  { id: '7', image: 'hero-pizza', top: '50%', left: '5%', size: 140, layer: 'front', delay: '1.5s', duration: '9s', hint: 'pizza' },
  { id: '8', image: 'hero-burger', top: '15%', left: '40%', size: 100, layer: 'front', delay: '2.5s', duration: '8s', hint: 'burger' },
  { id: '9', image: 'hero-thali', top: '85%', left: '85%', size: 180, layer: 'front', delay: '5s', duration: '15s', hint: 'indian thali' },
];

export default function HeroBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getParallaxStyle = (layer: 'back' | 'mid' | 'front') => {
    const depth = layer === 'front' ? 30 : layer === 'mid' ? 18 : 10;

    const rotateX = mousePos.y * depth * 0.3;
    const rotateY = mousePos.x * depth * 0.3;

    return {
      transform: `
        translate3d(${mousePos.x * depth}px, ${mousePos.y * depth}px, 0)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
      `,
      transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
      transformStyle: 'preserve-3d' as const,
    };
  };

  const getLayerClasses = (layer: 'back' | 'mid' | 'front') => {
    switch (layer) {
      case 'back': return 'opacity-20 blur-[6px] grayscale-[20%]';
      case 'mid': return 'opacity-40 blur-[2px]';
      case 'front': return 'opacity-60 blur-none scale-110';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#FDFCFB]">
      {/* Dynamic Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,153,51,0.08)_0%,_transparent_70%)]" />
      <div 
        className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-[#FFB347]/10 rounded-full blur-[120px] animate-pulse-glow"
        style={{ transform: 'translate(-50%, -50%)' }}
      />

      {/* Floating Elements Container */}
      <div className="relative w-full h-full">
        {floatingItems.map((item) => {
          const imageData = PlaceHolderImages.find(img => img.id === item.image);
          return (
            <div
              key={item.id}
              className="absolute will-change-transform"
              style={{
                top: item.top,
                left: item.left,
                ...getParallaxStyle(item.layer)
              }}
            >
              <div 
                className={`relative animate-float-complex ${getLayerClasses(item.layer)}`}
                style={{ 
                  width: item.size, 
                  height: item.size,
                  animationDelay: item.delay,
                  animationDuration: item.duration
                }}
              >
                {imageData && (
                  <Image
                    src={imageData.imageUrl}
                    alt={imageData.description}
                    fill
                    className="object-contain drop-shadow-[0_20px_40px_rgba(255,120,50,0.25)]"
                    data-ai-hint={item.hint}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40" />
    </div>
  );
}