'use client';

import { useState } from 'react';
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
  onUpdateDialogue?: (panelIndex: number, dialogue: string | null) => void;
  onUpdateNarration?: (panelIndex: number, narration: string | null) => void;
}

function BubbleOverlay({
  dialogue,
  bubbleStyle,
  bubbleX,
  bubbleY,
  editable,
  onEdit,
  panelIndex,
}: {
  dialogue: string | null;
  bubbleStyle: 'normal' | 'thought' | 'shout';
  bubbleX?: number;
  bubbleY?: number;
  editable?: boolean;
  onEdit?: (text: string) => void;
  panelIndex: number;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(dialogue || '');

  if (!dialogue && !editable) return null;

  // Use AI-provided coordinates, fallback to alternating positions
  const hasAiPos = typeof bubbleX === 'number' && typeof bubbleY === 'number';
  const x = hasAiPos ? Math.max(3, Math.min(75, bubbleX)) : (panelIndex % 2 === 0 ? 8 : 48);
  const y = hasAiPos ? Math.max(2, Math.min(45, bubbleY)) : 6 + (panelIndex % 3) * 5;
  const tailOnLeft = x < 45;

  // SVG tail that curves naturally downward toward the character
  const normalTail = tailOnLeft
    ? 'M8,0 C8,0 2,18 0,28 C4,22 8,12 14,0 Z'
    : 'M6,0 C6,0 12,18 14,28 C10,22 6,12 0,0 Z';
  const shoutTail = tailOnLeft
    ? 'M6,0 L0,20 L12,0 Z'
    : 'M2,0 L8,20 L14,0 Z';

  if (editing && editable) {
    return (
      <div className="absolute z-20" style={{ left: `${x}%`, top: `${y}%` }}>
        <div className="flex items-center gap-1.5 rounded-xl bg-white p-1.5 shadow-2xl">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-36 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black"
            maxLength={15}
            autoFocus
          />
          <button
            onClick={() => { onEdit?.(text); setEditing(false); }}
            className="rounded-lg bg-neonYellow px-3 py-1.5 text-xs font-bold text-black"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  const displayText = dialogue || '...';

  if (bubbleStyle === 'shout') {
    return (
      <div
        className={`absolute z-10 ${editable ? 'cursor-pointer transition-transform hover:scale-110' : ''}`}
        style={{ left: `${x}%`, top: `${y}%` }}
        onClick={() => editable && setEditing(true)}
      >
        <div
          className="relative bg-black px-6 py-3 text-center shadow-xl"
          style={{
            clipPath: 'polygon(10% 0%, 90% 0%, 100% 15%, 98% 50%, 100% 85%, 90% 100%, 10% 100%, 0% 85%, 2% 50%, 0% 15%)',
          }}
        >
          <span className="text-base font-black tracking-wider text-white drop-shadow-sm"
            style={{ textShadow: '0 0 8px rgba(255,255,255,0.3)' }}
          >
            {displayText}
          </span>
        </div>
        <svg width="14" height="20" viewBox="0 0 14 28" className={`${tailOnLeft ? 'ml-[30%]' : 'ml-[60%]'} -mt-[2px]`}>
          <path d={shoutTail} fill="black" />
        </svg>
      </div>
    );
  }

  const isThought = bubbleStyle === 'thought';

  return (
    <div
      className={`absolute z-10 ${editable ? 'cursor-pointer transition-transform hover:scale-105' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => editable && setEditing(true)}
    >
      {isThought ? (
        <>
          <div
            className="rounded-[50%] border-2 border-gray-300 bg-white/95 px-5 py-3 text-center shadow-lg backdrop-blur-sm"
            style={{ minWidth: '5rem' }}
          >
            <span className="text-sm font-semibold italic leading-snug text-gray-500">
              {displayText}
            </span>
          </div>
          <div className={`flex flex-col ${tailOnLeft ? 'ml-[25%]' : 'ml-[65%]'}`}>
            <div className="mt-1.5 h-3 w-3 rounded-full border border-gray-300 bg-white/95" />
            <div className={`${tailOnLeft ? 'ml-1' : '-ml-0.5'} mt-1 h-2 w-2 rounded-full border border-gray-300 bg-white/90`} />
            <div className={`${tailOnLeft ? 'ml-2' : '-ml-1'} mt-0.5 h-1.5 w-1.5 rounded-full border border-gray-300 bg-white/80`} />
          </div>
        </>
      ) : (
        <>
          <div
            className="rounded-[50%] border-2 border-gray-900 bg-white px-6 py-3 text-center shadow-lg"
            style={{ minWidth: '5.5rem' }}
          >
            <span className="text-base font-bold leading-snug text-black">
              {displayText}
            </span>
          </div>
          <svg width="14" height="24" viewBox="0 0 14 28" className={`${tailOnLeft ? 'ml-[25%]' : 'ml-[60%]'} -mt-[3px]`}>
            <path d={normalTail} fill="white" stroke="#111827" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </>
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
  onUpdateDialogue,
  onUpdateNarration,
}: EpisodeViewerProps) {
  const t = useTranslations('Gallery');

  return (
    <div className="flex flex-col">
      {/* Episode Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-gray-400">{synopsis}</p>
      </div>

      {/* Panels */}
      <div className="space-y-1 bg-black">
        {panels.map((panel, index) => (
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
                  bubbleX={panel.bubbleX}
                  bubbleY={panel.bubbleY}
                  editable={editable}
                  onEdit={(text) => onUpdateDialogue?.(index, text || null)}
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
        ))}
      </div>
    </div>
  );
}
