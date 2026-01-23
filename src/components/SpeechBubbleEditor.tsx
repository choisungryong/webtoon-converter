'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import NextImage from 'next/image';
import { generateUUID } from '../utils/commonUtils';

export type BubbleStyle = 'normal' | 'thought' | 'shout';

export interface BubbleData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: BubbleStyle;
}

interface SpeechBubbleEditorProps {
  imageSrc: string;
  onSave: (compositeImageDataUrl: string) => void;
  onCancel: () => void;
  suggestedText?: string;
}

const BUBBLE_STYLES: { id: BubbleStyle; label: string; icon: string }[] = [
  { id: 'normal', label: '일반', icon: '💬' },
  { id: 'thought', label: '생각', icon: '💭' },
  { id: 'shout', label: '외침', icon: '📢' },
];

const SpeechBubbleEditor: React.FC<SpeechBubbleEditorProps> = ({
  imageSrc,
  onSave,
  onCancel,
  suggestedText = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [currentStyle, setCurrentStyle] = useState<BubbleStyle>('normal');

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const containerWidth = containerRef.current?.clientWidth || 400;
      const scale = Math.min(1, (containerWidth - 32) / img.width);
      setImageSize({
        width: img.width * scale,
        height: img.height * scale,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Fetch AI suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch('/api/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageSrc }),
        });
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setAiSuggestions(data.suggestions);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setAiSuggestions(['여기 좋다!', '최고야!', '대박!']);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    if (imageSrc) {
      fetchSuggestions();
    }
  }, [imageSrc]);

  // Add bubble handler with AI suggested text
  const handleAddBubble = () => {
    const defaultText = aiSuggestions[suggestionIndex] || suggestedText || '대사를 입력하세요';
    const newBubble: BubbleData = {
      id: generateUUID(),
      x: imageSize.width / 2 - 80,
      y: 30 + bubbles.length * 60, // Stack bubbles vertically
      width: 160,
      height: 50,
      text: defaultText,
      style: currentStyle,
    };
    setBubbles((prev) => [...prev, newBubble]);
    setSelectedBubbleId(newBubble.id);
    // Cycle to next suggestion
    setSuggestionIndex((prev) => (prev + 1) % Math.max(1, aiSuggestions.length));
  };

  // Delete selected bubble
  const handleDeleteBubble = () => {
    if (selectedBubbleId) {
      setBubbles((prev) => prev.filter((b) => b.id !== selectedBubbleId));
      setSelectedBubbleId(null);
    }
  };

  // Update bubble text
  const handleTextChange = (text: string) => {
    if (selectedBubbleId) {
      setBubbles((prev) => prev.map((b) => (b.id === selectedBubbleId ? { ...b, text } : b)));
    }
  };

  // Update bubble style
  const handleStyleChange = (style: BubbleStyle) => {
    setCurrentStyle(style);
    if (selectedBubbleId) {
      setBubbles((prev) => prev.map((b) => (b.id === selectedBubbleId ? { ...b, style } : b)));
    }
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, bubbleId: string) => {
    e.stopPropagation();
    const bubble = bubbles.find((b) => b.id === bubbleId);
    if (!bubble) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setResizeStart({
      x: clientX,
      y: clientY,
      w: bubble.width,
      h: bubble.height,
    });
    setIsResizing(true);
    setSelectedBubbleId(bubbleId);
  };

  // Drag handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent, bubbleId: string) => {
    e.stopPropagation();
    const bubble = bubbles.find((b) => b.id === bubbleId);
    if (!bubble || !canvasContainerRef.current) return;

    const rect = canvasContainerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - bubble.x,
      y: e.clientY - rect.top - bubble.y,
    });
    setIsDragging(true);
    setSelectedBubbleId(bubbleId);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, bubbleId: string) => {
    e.stopPropagation();
    const bubble = bubbles.find((b) => b.id === bubbleId);
    if (!bubble || !canvasContainerRef.current) return;

    const touch = e.touches[0];
    const rect = canvasContainerRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left - bubble.x,
      y: touch.clientY - rect.top - bubble.y,
    });
    setIsDragging(true);
    setSelectedBubbleId(bubbleId);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if ((!isDragging && !isResizing) || !selectedBubbleId || !canvasContainerRef.current) return;

      if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;

        setBubbles((prev) =>
          prev.map((b) =>
            b.id === selectedBubbleId
              ? {
                  ...b,
                  width: Math.max(60, resizeStart.w + dx),
                  height: Math.max(40, resizeStart.h + dy),
                }
              : b
          )
        );
        return;
      }

      const rect = canvasContainerRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      setBubbles((prev) =>
        prev.map((b) =>
          b.id === selectedBubbleId
            ? {
                ...b,
                x: Math.max(0, Math.min(newX, imageSize.width - b.width)),
                y: Math.max(0, Math.min(newY, imageSize.height - b.height)),
              }
            : b
        )
      );
    },
    [isDragging, isResizing, selectedBubbleId, dragOffset, imageSize, resizeStart]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if ((!isDragging && !isResizing) || !selectedBubbleId || !canvasContainerRef.current) return;

      e.preventDefault(); // Prevent scrolling while dragging or resizing
      const touch = e.touches[0];

      if (isResizing) {
        const dx = touch.clientX - resizeStart.x;
        const dy = touch.clientY - resizeStart.y;

        setBubbles((prev) =>
          prev.map((b) =>
            b.id === selectedBubbleId
              ? {
                  ...b,
                  width: Math.max(60, resizeStart.w + dx),
                  height: Math.max(40, resizeStart.h + dy),
                }
              : b
          )
        );
        return;
      }
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const newX = touch.clientX - rect.left - dragOffset.x;
      const newY = touch.clientY - rect.top - dragOffset.y;

      setBubbles((prev) =>
        prev.map((b) =>
          b.id === selectedBubbleId
            ? {
                ...b,
                x: Math.max(0, Math.min(newX, imageSize.width - b.width)),
                y: Math.max(0, Math.min(newY, imageSize.height - b.height)),
              }
            : b
        )
      );
    },
    [isDragging, isResizing, selectedBubbleId, dragOffset, imageSize, resizeStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Click outside to deselect
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedBubbleId(null);
    }
  };

  // Export with bubbles
  const handleExport = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const scale = img.width / imageSize.width;

      bubbles.forEach((bubble) => {
        const scaledX = bubble.x * scale;
        const scaledY = bubble.y * scale;
        const scaledWidth = bubble.width * scale;
        const scaledHeight = bubble.height * scale;
        const isThought = bubble.style === 'thought';
        const isShout = bubble.style === 'shout';

        // Shout style - black box with white text
        if (isShout) {
          // Draw black background
          ctx.fillStyle = '#000000';
          ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

          // Draw border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 1 * scale;
          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

          // Draw white text
          ctx.fillStyle = '#ffffff';
          // Dynamic font size based on height ratio (0.3)
          const fontSize = Math.round(scaledHeight * 0.3);
          ctx.font = `500 ${fontSize}px 'Noto Sans KR', 'Nanum Gothic', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bubble.text, scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);
          return;
        }

        // Normal & Thought - ellipse with thin black border
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5 * scale;

        // Draw ellipse
        ctx.beginPath();
        ctx.ellipse(
          scaledX + scaledWidth / 2,
          scaledY + scaledHeight / 2,
          scaledWidth / 2,
          scaledHeight / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw tail for normal bubbles
        if (!isThought) {
          const tailX = scaledX + scaledWidth * 0.28;
          ctx.beginPath();
          ctx.moveTo(tailX, scaledY + scaledHeight - 2 * scale);
          ctx.quadraticCurveTo(
            tailX + 7 * scale,
            scaledY + scaledHeight + 12 * scale,
            tailX + 14 * scale,
            scaledY + scaledHeight - 2 * scale
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Thought bubble dots
        if (isThought) {
          ctx.beginPath();
          ctx.arc(
            scaledX + scaledWidth * 0.32,
            scaledY + scaledHeight + 8 * scale,
            4 * scale,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(
            scaledX + scaledWidth * 0.25,
            scaledY + scaledHeight + 18 * scale,
            2.5 * scale,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.stroke();
        }

        // Draw text
        ctx.fillStyle = '#000000';
        // Dynamic font size based on height ratio (0.3)
        const fontSize = Math.round(scaledHeight * 0.3);
        ctx.font = `700 ${fontSize}px 'Noto Sans KR', 'Nanum Gothic', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bubble.text, scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);
      });

      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    };

    img.src = imageSrc;
  };

  const selectedBubble = bubbles.find((b) => b.id === selectedBubbleId);

  return (
    <div className="speech-bubble-editor" ref={containerRef}>
      {/* Top Toolbar - Simplified */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          marginBottom: '12px',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleAddBubble}
            disabled={loadingSuggestions}
            style={{
              padding: '10px 16px',
              background: 'var(--accent-color)',
              color: 'black',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: loadingSuggestions ? 'wait' : 'pointer',
              fontSize: '13px',
              opacity: loadingSuggestions ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loadingSuggestions ? '✨ AI 분석중...' : '💬 말풍선 추가'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {BUBBLE_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleStyleChange(s.id)}
              title={s.label}
              style={{
                padding: '8px 10px',
                background: currentStyle === s.id ? 'var(--accent-color)' : 'transparent',
                color: currentStyle === s.id ? 'black' : 'var(--text-secondary)',
                border: currentStyle === s.id ? 'none' : '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.15s ease',
              }}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasContainerRef}
        onClick={handleCanvasClick}
        style={{
          position: 'relative',
          background: '#000',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <NextImage
          src={imageSrc}
          alt="Edit"
          width={Math.round(imageSize.width) || 1}
          height={Math.round(imageSize.height) || 1}
          style={{
            width: imageSize.width,
            height: imageSize.height,
            display: 'block',
          }}
          draggable={false}
          unoptimized
        />

        {/* Bubbles */}
        {bubbles.map((bubble) => {
          const isSelected = selectedBubbleId === bubble.id;
          const isThought = bubble.style === 'thought';
          const isShout = bubble.style === 'shout';

          // Dynamic font size based on bubble height (0.3 ratio)
          const dynamicFontSize = Math.max(12, Math.round(bubble.height * 0.3));

          // Shout style - black box with white text (narration style)
          if (isShout) {
            return (
              <div
                key={bubble.id}
                onMouseDown={(e) => handleMouseDown(e, bubble.id)}
                onTouchStart={(e) => handleTouchStart(e, bubble.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBubbleId(bubble.id);
                }}
                style={{
                  position: 'absolute',
                  left: bubble.x,
                  top: bubble.y,
                  width: bubble.width,
                  height: bubble.height,
                  background: '#000000',
                  border: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  boxShadow: isSelected ? '0 0 0 2px #fff' : 'none',
                  padding: '12px 16px',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Noto Sans KR', 'Nanum Gothic', sans-serif",
                    fontSize: `${dynamicFontSize}px`,
                    fontWeight: 500,
                    color: '#ffffff',
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    lineHeight: 1.5,
                  }}
                >
                  {bubble.text}
                </span>
                {isSelected && (
                  <div
                    onMouseDown={(e) => handleResizeStart(e, bubble.id)}
                    onTouchStart={(e) => handleResizeStart(e, bubble.id)}
                    style={{
                      position: 'absolute',
                      right: -6,
                      bottom: -6,
                      width: 16,
                      height: 16,
                      background: '#fff',
                      border: '2px solid #000',
                      borderRadius: '50%',
                      cursor: 'se-resize',
                      zIndex: 10,
                    }}
                  />
                )}
              </div>
            );
          }

          // Normal & Thought - ellipse bubble with thin black border
          return (
            <div
              key={bubble.id}
              onMouseDown={(e) => handleMouseDown(e, bubble.id)}
              onTouchStart={(e) => handleTouchStart(e, bubble.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBubbleId(bubble.id);
              }}
              style={{
                position: 'absolute',
                left: bubble.x,
                top: bubble.y,
                width: bubble.width,
                height: bubble.height,
                background: '#ffffff',
                border: '1.5px solid #000000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isDragging ? 'grabbing' : 'grab',
                padding: '8px 12px',
                boxSizing: 'border-box',
                userSelect: 'none',
                boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {/* SVG Tail for normal */}
              {!isThought && (
                <svg
                  style={{
                    position: 'absolute',
                    bottom: -11,
                    left: '28%',
                    width: 14,
                    height: 12,
                    overflow: 'visible',
                  }}
                  viewBox="0 0 14 12"
                >
                  <path d="M0,0 Q7,12 14,0" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                  <rect x="0" y="-1" width="14" height="2" fill="#ffffff" />
                </svg>
              )}

              {/* Thought bubble dots */}
              {isThought && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -9,
                      left: '32%',
                      width: 7,
                      height: 7,
                      background: '#ffffff',
                      border: '1.5px solid #000',
                      borderRadius: '50%',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -18,
                      left: '25%',
                      width: 4,
                      height: 4,
                      background: '#ffffff',
                      border: '1.5px solid #000',
                      borderRadius: '50%',
                    }}
                  />
                </>
              )}

              <span
                style={{
                  fontFamily: "'Noto Sans KR', 'Nanum Gothic', sans-serif",
                  fontSize: `${dynamicFontSize}px`,
                  fontWeight: 700,
                  color: '#000000',
                  textAlign: 'center',
                  wordBreak: 'keep-all',
                  lineHeight: 1.4,
                }}
              >
                {bubble.text}
              </span>
              {isSelected && (
                <div
                  onMouseDown={(e) => handleResizeStart(e, bubble.id)}
                  onTouchStart={(e) => handleResizeStart(e, bubble.id)}
                  style={{
                    position: 'absolute',
                    right: '12%',
                    bottom: '12%',
                    width: 16,
                    height: 16,
                    background: '#fff',
                    border: '2px solid #000',
                    borderRadius: '50%',
                    cursor: 'se-resize',
                    zIndex: 10,
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Hint */}
        {bubbles.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '12px',
              fontSize: '14px',
              pointerEvents: 'none',
            }}
          >
            상단 &quot;말풍선 추가&quot; 버튼을 클릭하세요
          </div>
        )}
      </div>

      {/* Selected Bubble Editor with AI Suggestions */}
      {selectedBubble && (
        <div
          style={{
            marginTop: '12px',
            padding: '16px',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Input Row */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: aiSuggestions.length > 0 ? '12px' : '0',
            }}
          >
            <input
              type="text"
              value={selectedBubble.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="대사를 입력하세요"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            <button
              onClick={handleDeleteBubble}
              style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="삭제"
            >
              🗑️
            </button>
          </div>

          {/* AI Suggestions - integrated into edit panel */}
          {aiSuggestions.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--accent-color)',
                  fontWeight: 500,
                  marginRight: '4px',
                }}
              >
                ✨ AI 추천
              </span>
              {aiSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTextChange(suggestion)}
                  style={{
                    padding: '5px 10px',
                    background:
                      selectedBubble.text === suggestion
                        ? 'var(--accent-color)'
                        : 'rgba(255,255,255,0.08)',
                    color: selectedBubble.text === suggestion ? 'black' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={suggestion}
                >
                  {suggestion.length > 10 ? suggestion.slice(0, 10) + '...' : suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Add with AI suggestion when no bubble selected */}
      {!selectedBubble && aiSuggestions.length > 0 && bubbles.length === 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '14px',
            background: 'rgba(204, 255, 0, 0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(204, 255, 0, 0.2)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '14px' }}>✨</span>
            AI가 이미지를 분석해 대사를 추천했어요!
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {aiSuggestions.slice(0, 3).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSuggestionIndex(idx);
                  handleAddBubble();
                }}
                style={{
                  padding: '8px 14px',
                  background: 'var(--accent-color)',
                  color: 'black',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                💬 {suggestion.length > 12 ? suggestion.slice(0, 12) + '...' : suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          취소
        </button>
        <button
          onClick={handleExport}
          style={{
            padding: '12px 24px',
            background: 'var(--accent-color)',
            color: 'black',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ✨ 완료
        </button>
      </div>
    </div>
  );
};

export default SpeechBubbleEditor;
