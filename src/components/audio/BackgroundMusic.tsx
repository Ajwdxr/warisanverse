'use client';

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { soundEnabled } = useUIStore();

  useEffect(() => {
    // Initialize audio
    const audio = new Audio('/sounds/bg-music.mp3');
    audio.loop = true;
    audio.volume = 0.2; // Set a subtle background volume
    audioRef.current = audio;

    // Start playback on first interaction if autoplay is blocked
    const handleFirstInteraction = () => {
      if (soundEnabled) {
        audio.play().catch(() => {
          console.log('Autoplay blocked, waiting for interaction');
        });
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      audio.pause();
      audioRef.current = null;
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    if (soundEnabled) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [soundEnabled]);

  return null; // This component doesn't render anything
}
