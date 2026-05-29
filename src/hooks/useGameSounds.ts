import { useCallback, useEffect, useRef, useState } from 'react';

const LS_KEY = 'lvtk:game_sound';

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useGameSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const scratchRef = useRef<{ src: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored !== null) return stored === '1';
    } catch {}
    return !prefersReducedMotion();
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, enabled ? '1' : '0'); } catch {}
  }, [enabled]);

  const getCtx = useCallback(() => {
    if (!enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current?.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, [enabled]);

  const tick = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }, [getCtx]);

  const win = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }, [getCtx]);

  const startScratch = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || scratchRef.current) return;
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    scratchRef.current = { src, gain };
  }, [getCtx]);

  const stopScratch = useCallback(() => {
    const ref = scratchRef.current;
    if (!ref || !ctxRef.current) return;
    const t = ctxRef.current.currentTime;
    ref.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    setTimeout(() => { try { ref.src.stop(); } catch {} }, 120);
    scratchRef.current = null;
  }, []);

  const toggle = useCallback(() => setEnabled((e) => !e), []);

  useEffect(() => () => { try { ctxRef.current?.close(); } catch {} }, []);

  return { enabled, toggle, tick, win, startScratch, stopScratch };
}
