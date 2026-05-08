'use client';

import { useState, useRef } from 'react';

type CropType = 'cover' | 'avatar';

const FRAME: Record<CropType, { w: number; h: number; outputW: number; outputH: number; circle: boolean }> = {
  cover:  { w: 320, h: 108, outputW: 1200, outputH: 400, circle: false },
  avatar: { w: 240, h: 240, outputW: 400,  outputH: 400, circle: true  },
};

interface Props {
  src: string;
  cropType: CropType;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ src, cropType, onConfirm, onCancel }: Props) {
  const f = FRAME[cropType];
  const imgEl = useRef<HTMLImageElement>(null);

  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  const minScaleRef = useRef(1);

  function clamp(px: number, py: number, sc: number, nw: number, nh: number) {
    const iw = nw * sc;
    const ih = nh * sc;
    return {
      x: Math.min(0, Math.max(f.w - iw, px)),
      y: Math.min(0, Math.max(f.h - ih, py)),
    };
  }

  function onLoad() {
    const img = imgEl.current!;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const initScale = Math.max(f.w / nw, f.h / nh);
    minScaleRef.current = initScale;
    setNatW(nw);
    setNatH(nh);
    setScale(initScale);
    setPan({
      x: (f.w - nw * initScale) / 2,
      y: (f.h - nh * initScale) / 2,
    });
    setReady(true);
  }

  // --- mouse drag ---
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => clamp(p.x + dx, p.y + dy, scale, natW, natH));
  }
  function stopDrag() { dragging.current = false; }

  // --- wheel zoom ---
  function onWheel(e: React.WheelEvent) {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    applyZoom(factor, e.clientX - rect.left, e.clientY - rect.top);
  }

  function applyZoom(factor: number, cx: number, cy: number) {
    setScale(prev => {
      const next = Math.max(minScaleRef.current, Math.min(prev * factor, minScaleRef.current * 5));
      setPan(p => clamp(
        cx - (cx - p.x) * (next / prev),
        cy - (cy - p.y) * (next / prev),
        next, natW, natH,
      ));
      return next;
    });
  }

  // --- touch ---
  const lastTouches = useRef<{ x: number; y: number }[]>([]);

  function onTouchStart(e: React.TouchEvent) {
    lastTouches.current = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    const prev = lastTouches.current;

    if (touches.length === 1 && prev.length >= 1) {
      const dx = touches[0].x - prev[0].x;
      const dy = touches[0].y - prev[0].y;
      setPan(p => clamp(p.x + dx, p.y + dy, scale, natW, natH));
    } else if (touches.length === 2 && prev.length === 2) {
      const prevDist = Math.hypot(prev[1].x - prev[0].x, prev[1].y - prev[0].y);
      const currDist = Math.hypot(touches[1].x - touches[0].x, touches[1].y - touches[0].y);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = (touches[0].x + touches[1].x) / 2 - rect.left;
      const cy = (touches[0].y + touches[1].y) / 2 - rect.top;
      applyZoom(currDist / prevDist, cx, cy);
    }
    lastTouches.current = touches;
  }

  // --- confirm ---
  function confirm() {
    const img = imgEl.current!;
    const canvas = document.createElement('canvas');
    canvas.width = f.outputW;
    canvas.height = f.outputH;
    const ctx = canvas.getContext('2d')!;

    if (f.circle) {
      ctx.beginPath();
      ctx.arc(f.outputW / 2, f.outputH / 2, f.outputW / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, -pan.x / scale, -pan.y / scale, f.w / scale, f.h / scale, 0, 0, f.outputW, f.outputH);
    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDE3EC]">
          <button onClick={onCancel} className="text-sm text-[#9AA3B8]">Отмена</button>
          <span className="text-sm font-semibold text-[#1F2A44]">
            {cropType === 'cover' ? 'Обложка' : 'Фото профиля'}
          </span>
          <button onClick={confirm} disabled={!ready} className="text-sm font-semibold text-[#6B7FA8] disabled:opacity-40">
            Готово
          </button>
        </div>

        {/* Crop zone */}
        <div className="flex items-center justify-center bg-black py-6">
          <div
            className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
            style={{
              width: f.w,
              height: f.h,
              borderRadius: f.circle ? '50%' : 8,
              touchAction: 'none',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { lastTouches.current = []; }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgEl}
              src={src}
              alt=""
              onLoad={onLoad}
              draggable={false}
              style={{
                position: 'absolute',
                left: pan.x,
                top: pan.y,
                width: natW * scale,
                height: natH * scale,
                pointerEvents: 'none',
                visibility: ready ? 'visible' : 'hidden',
              }}
            />
          </div>
        </div>

        <p className="text-center text-xs text-[#9AA3B8] py-3">
          Перемещайте и масштабируйте изображение
        </p>
      </div>
    </div>
  );
}
