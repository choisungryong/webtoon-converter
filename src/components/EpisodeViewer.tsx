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

  const bubbleClasses = {
    normal: 'bg-white text-black border-2 border-black rounded-[50%] px-4 py-2',
    thought: 'bg-white/90 text-gray-700 border-2 border-dashed border-gray-400 rounded-[50%] px-4 py-2',
    shout: 'bg-black text-white font-black px-4 py-2 rounded-lg',
  };

  if (editing && editable) {
    return (
      <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
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

  return (
    <div
      className={`absolute left-1/2 top-4 z-10 max-w-[70%] -translate-x-1/2 text-center text-sm font-bold shadow-lg ${bubbleClasses[bubbleStyle]} ${editable ? 'cursor-pointer hover:ring-2 hover:ring-neonYellow' : ''}`}
      onClick={() => editable && setEditing(true)}
    >
      {dialogue || '...'}
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
