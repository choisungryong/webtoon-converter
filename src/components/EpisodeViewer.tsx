'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { PanelStory } from '../types';

interface EpisodePanel extends PanelStory {
  imageId: string | null;
  imageUrl: string | null;
}

interface EpisodeViewerProps {
  title: string;
  synopsis: string;
  panels: EpisodePanel[];
  editable?: boolean;
  onUpdatePanel?: (panelIndex: number, updates: Partial<PanelStory>) => void;
}

type BubbleSize = 'sm' | 'md' | 'lg';

const SIZE_SCALES: Record<BubbleSize, { text: string; px: string; py: string; min: string; tail: number }> = {
  sm: { text: 'text-xs', px: 'px-4', py: 'py-2', min: '3.5rem', tail: 18 },
  md: { text: 'text-sm', px: 'px-6', py: 'py-3', min: '5rem', tail: 24 },
  lg: { text: 'text-base', px: 'px-8', py: 'py-4', min: '6.5rem', tail: 30 },
};

function BubbleOverlay({
  dialogue,
  bubbleStyle,
  bubbleX,
  bubbleY,
  bubbleSize = 'md',
  editable,
  onMove,
  onResize,
  panelIndex,
}: {
  dialogue: string | null;
  bubbleStyle: 'normal' | 'thought' | 'shout';
  bubbleX?: number;
  bubbleY?: number;
  bubbleSize?: BubbleSize;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
  onResize?: (size: BubbleSize) => void;
  panelIndex: number;
}) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  if (!dialogue) return null;

  const hasAiPos = typeof bubbleX === 'number' && typeof bubbleY === 'number';
  const x = hasAiPos ? Math.max(2, Math.min(78, bubbleX)) : (panelIndex % 2 === 0 ? 8 : 48);
  const y = hasAiPos ? Math.max(2, Math.min(55, bubbleY)) : 6 + (panelIndex % 3) * 5;
  const tailOnLeft = x < 45;
  const scale = SIZE_SCALES[bubbleSize];

  // --- Drag handlers ---
  const getParentRect = () => {
    const el = containerRef.current?.parentElement;
    return el ? el.getBoundingClientRect() : null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(true);
    setDragging(true);
    dragStart.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const parentRect = getParentRect();
    if (!parentRect) return;
    const dx = ((e.clientX - dragStart.current.startX) / parentRect.width) * 100;
    const dy = ((e.clientY - dragStart.current.startY) / parentRect.height) * 100;
    const newX = Math.max(2, Math.min(78, dragStart.current.origX + dx));
    const newY = Math.max(2, Math.min(70, dragStart.current.origY + dy));
    onMove?.(Math.round(newX), Math.round(newY));
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const cycleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sizes: BubbleSize[] = ['sm', 'md', 'lg'];
    const idx = sizes.indexOf(bubbleSize);
    onResize?.(sizes[(idx + 1) % sizes.length]);
  };

  // --- SVG tails ---
  const normalTail = tailOnLeft
    ? `M8,0 C8,0 2,${scale.tail * 0.65} 0,${scale.tail} C4,${scale.tail * 0.8} 8,${scale.tail * 0.4} 14,0 Z`
    : `M6,0 C6,0 12,${scale.tail * 0.65} 14,${scale.tail} C10,${scale.tail * 0.8} 6,${scale.tail * 0.4} 0,0 Z`;
  const shoutTail = tailOnLeft
    ? `M6,0 L0,${scale.tail} L12,0 Z`
    : `M2,0 L8,${scale.tail} L14,0 Z`;

  const selectedRing = selected && editable ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent' : '';

  // --- Render bubble body ---
  const renderBubble = () => {
    if (bubbleStyle === 'shout') {
      return (
        <>
          <div
            className={`relative bg-black ${scale.px} ${scale.py} text-center shadow-xl ${selectedRing}`}
            style={{
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 15%, 98% 50%, 100% 85%, 90% 100%, 10% 100%, 0% 85%, 2% 50%, 0% 15%)',
              minWidth: scale.min,
            }}
          >
            <span className={`${scale.text} font-black tracking-wider text-white`}
              style={{ textShadow: '0 0 8px rgba(255,255,255,0.3)' }}
            >
              {dialogue}
            </span>
          </div>
          <svg width="14" height={scale.tail} viewBox={`0 0 14 ${scale.tail}`} className={`${tailOnLeft ? 'ml-[30%]' : 'ml-[60%]'} -mt-[2px]`}>
            <path d={shoutTail} fill="black" />
          </svg>
        </>
      );
    }

    if (bubbleStyle === 'thought') {
      return (
        <>
          <div
            className={`rounded-[50%] border-2 border-gray-300 bg-white/95 ${scale.px} ${scale.py} text-center shadow-lg backdrop-blur-sm ${selectedRing}`}
            style={{ minWidth: scale.min }}
          >
            <span className={`${scale.text} font-semibold italic leading-snug text-gray-500`}>
              {dialogue}
            </span>
          </div>
          <div className={`flex flex-col ${tailOnLeft ? 'ml-[25%]' : 'ml-[65%]'}`}>
            <div className="mt-1.5 h-3 w-3 rounded-full border border-gray-300 bg-white/95" />
            <div className={`${tailOnLeft ? 'ml-1' : '-ml-0.5'} mt-1 h-2 w-2 rounded-full border border-gray-300 bg-white/90`} />
            <div className={`${tailOnLeft ? 'ml-2' : '-ml-1'} mt-0.5 h-1.5 w-1.5 rounded-full border border-gray-300 bg-white/80`} />
          </div>
        </>
      );
    }

    // normal
    return (
      <>
        <div
          className={`rounded-[50%] border-2 border-gray-900 bg-white ${scale.px} ${scale.py} text-center shadow-lg ${selectedRing}`}
          style={{ minWidth: scale.min }}
        >
          <span className={`${scale.text} font-bold leading-snug text-black`}>
            {dialogue}
          </span>
        </div>
        <svg width="14" height={scale.tail} viewBox={`0 0 14 ${scale.tail}`} className={`${tailOnLeft ? 'ml-[25%]' : 'ml-[60%]'} -mt-[3px]`}>
          <path d={normalTail} fill="white" stroke="#111827" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`absolute z-10 ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging ? 'opacity-90' : ''}`}
      style={{ left: `${x}%`, top: `${y}%`, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {renderBubble()}

      {/* Size toggle button — visible when selected in edit mode */}
      {selected && editable && (
        <button
          onClick={cycleSize}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-black text-black shadow-md transition-transform hover:scale-110"
          title="크기 변경"
        >
          {bubbleSize === 'sm' ? 'S' : bubbleSize === 'md' ? 'M' : 'L'}
        </button>
      )}
    </div>
  );
}

function NarrationBox({ narration }: { narration: string | null }) {
  if (!narration) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-4 pt-10">
      <p className="text-center text-sm leading-relaxed text-gray-100" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
        {narration}
      </p>
    </div>
  );
}

export default function EpisodeViewer({
  title,
  synopsis,
  panels,
  editable = false,
  onUpdatePanel,
}: EpisodeViewerProps) {
  const t = useTranslations('Gallery');

  // Local state to allow live dragging before saving
  const [localOverrides, setLocalOverrides] = useState<Record<number, { bubbleX?: number; bubbleY?: number; bubbleSize?: BubbleSize }>>({});

  const handleMove = useCallback((panelIndex: number, x: number, y: number) => {
    setLocalOverrides(prev => ({
      ...prev,
      [panelIndex]: { ...prev[panelIndex], bubbleX: x, bubbleY: y },
    }));
    onUpdatePanel?.(panelIndex, { bubbleX: x, bubbleY: y });
  }, [onUpdatePanel]);

  const handleResize = useCallback((panelIndex: number, size: BubbleSize) => {
    setLocalOverrides(prev => ({
      ...prev,
      [panelIndex]: { ...prev[panelIndex], bubbleSize: size },
    }));
    onUpdatePanel?.(panelIndex, { bubbleSize: size });
  }, [onUpdatePanel]);

  return (
    <div className="flex flex-col">
      {/* Episode Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-gray-400">{synopsis}</p>
      </div>

      {/* Panels */}
      <div className="space-y-1 bg-black">
        {panels.map((panel, index) => {
          const overrides = localOverrides[index] || {};
          return (
            <div key={index} className="relative">
              {panel.imageUrl ? (
                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src={panel.imageUrl}
                    alt={`Panel ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 600px"
                  />
                  <BubbleOverlay
                    dialogue={panel.dialogue}
                    bubbleStyle={panel.bubbleStyle}
                    bubbleX={overrides.bubbleX ?? panel.bubbleX}
                    bubbleY={overrides.bubbleY ?? panel.bubbleY}
                    bubbleSize={overrides.bubbleSize ?? panel.bubbleSize ?? 'md'}
                    editable={editable}
                    onMove={(x, y) => handleMove(index, x, y)}
                    onResize={(size) => handleResize(index, size)}
                    panelIndex={index}
                  />
                  <NarrationBox narration={panel.narration} />
                </div>
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center bg-gray-900">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl">🎨</div>
                    <p className="mt-2 text-sm">{t('episode_converting_panel', { current: index + 1, total: panels.length })}</p>
                  </div>
                </div>
              )}

              {/* Panel number indicator */}
              <div className="absolute bottom-2 right-2 z-20 rounded-full bg-black/60 px-2 py-0.5 text-xs text-gray-300">
                {index + 1}/{panels.length}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
