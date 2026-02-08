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
  editable,
  onEdit,
}: {
  dialogue: string | null;
  bubbleStyle: 'normal' | 'thought' | 'shout';
  editable?: boolean;
  onEdit?: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(dialogue || '');

  if (!dialogue && !editable) return null;

  if (editing && editable) {
    return (
      <div className="absolute left-1/2 top-[35%] z-20 -translate-x-1/2">
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

  // Bubble styles per type
  const bubbleContent = (
    <span className="relative z-10">{dialogue || '...'}</span>
  );

  if (bubbleStyle === 'shout') {
    return (
      <div
        className={`absolute left-1/2 top-[30%] z-10 -translate-x-1/2 ${editable ? 'cursor-pointer hover:ring-2 hover:ring-neonYellow' : ''}`}
        onClick={() => editable && setEditing(true)}
      >
        <div className="relative bg-black px-5 py-2 text-center text-sm font-black text-white shadow-lg"
          style={{ clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)' }}
        >
          {bubbleContent}
        </div>
      </div>
    );
  }

  const isThought = bubbleStyle === 'thought';

  return (
    <div
      className={`absolute left-1/2 top-[30%] z-10 -translate-x-1/2 ${editable ? 'cursor-pointer hover:ring-2 hover:ring-neonYellow' : ''}`}
      onClick={() => editable && setEditing(true)}
    >
      {/* Bubble body */}
      <div
        className={`relative max-w-[70vw] text-center text-sm font-bold shadow-lg ${
          isThought
            ? 'rounded-[50%] border-2 border-dashed border-gray-400 bg-white/90 px-5 py-3 text-gray-700'
            : 'rounded-[50%] border-2 border-black bg-white px-5 py-3 text-black'
        }`}
      >
        {bubbleContent}
      </div>
      {/* Tail pointing down toward character */}
      {isThought ? (
        <div className="flex flex-col items-center">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-white/90 shadow" />
          <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-white/90 shadow" />
        </div>
      ) : (
        <div className="flex justify-center">
          <div
            className="h-0 w-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '12px solid white',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))',
            }}
          />
        </div>
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
            {/* Panel Image */}
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
                  editable={editable}
                  onEdit={(text) => onUpdateDialogue?.(index, text || null)}
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
