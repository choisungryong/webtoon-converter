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

  // Use AI-provided coordinates if available, otherwise fallback
  const hasAiPosition = typeof bubbleX === 'number' && typeof bubbleY === 'number';
  const xPercent = hasAiPosition ? Math.max(5, Math.min(85, bubbleX)) : (panelIndex % 2 === 0 ? 12 : 60);
  const yPercent = hasAiPosition ? Math.max(3, Math.min(40, bubbleY)) : 8 + (panelIndex % 3) * 4;
  // Tail direction: bubble on left half → tail points right-down, on right → left-down
  const tailOnLeft = xPercent < 50;

  if (editing && editable) {
    return (
      <div className="absolute z-20" style={{ left: `${xPercent}%`, top: `${yPercent}%` }}>
        <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-xl">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-32 rounded border border-gray-300 px-2 py-1 text-sm text-black"
            maxLength={15}
            autoFocus
          />
          <button
            onClick={() => {
              onEdit?.(text);
              setEditing(false);
            }}
            className="rounded bg-neonYellow px-2 py-1 text-xs font-bold text-black"
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
        className={`absolute z-10 ${editable ? 'cursor-pointer hover:scale-105' : ''}`}
        style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
        onClick={() => editable && setEditing(true)}
      >
        <div className="rounded-md bg-black px-4 py-1.5 text-center text-sm font-black tracking-wide text-white shadow-lg">
          {displayText}
        </div>
        {/* Tail pointing toward character */}
        <svg width="20" height="14" viewBox="0 0 20 14" className={`${tailOnLeft ? 'ml-2' : 'ml-auto mr-2'} -mt-px`}>
          <path d="M0,0 Q10,14 8,14 Q6,10 0,0" fill="black" />
        </svg>
      </div>
    );
  }

  const isThought = bubbleStyle === 'thought';

  return (
    <div
      className={`absolute z-10 ${editable ? 'cursor-pointer hover:scale-105' : ''}`}
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      onClick={() => editable && setEditing(true)}
    >
      {/* Bubble body */}
      <div
        className={`relative max-w-[60vw] px-4 py-2 text-center text-[13px] font-bold leading-tight shadow-md ${
          isThought
            ? 'rounded-2xl border-[1.5px] border-dashed border-gray-400 bg-white/95 text-gray-600'
            : 'rounded-2xl border-[1.5px] border-gray-800 bg-white text-black'
        }`}
      >
        {displayText}
      </div>
      {/* Tail pointing toward character */}
      {isThought ? (
        <div className={`flex flex-col ${tailOnLeft ? 'ml-3' : 'ml-auto mr-3'}`}>
          <div className="mt-1 h-2 w-2 rounded-full border border-gray-400 bg-white/95" />
          <div className={`${tailOnLeft ? 'ml-1' : 'mr-1 ml-auto'} mt-0.5 h-1.5 w-1.5 rounded-full border border-gray-400 bg-white/95`} />
        </div>
      ) : (
        <svg width="16" height="12" viewBox="0 0 16 12" className={`${tailOnLeft ? 'ml-3' : 'ml-auto mr-3'} -mt-px`}>
          <path d="M0,0 C4,0 6,8 8,12 C4,8 2,4 0,0" fill="white" stroke="#1f2937" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
}

function NarrationBox({ narration }: { narration: string | null }) {
  if (!narration) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-6">
      <p className="text-center text-xs italic text-gray-200">{narration}</p>
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
