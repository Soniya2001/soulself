import React, { useState, useRef, useEffect } from "react";
import { StickerPlacement } from "../types";
import { RotateCw, X, Trash2 } from "lucide-react";
import { audioManager } from "../utils/audio";

interface InteractiveStickerProps {
  sticker: StickerPlacement;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (updated: StickerPlacement) => void;
  onRemove: (id: string) => void;
}

type DragMode = "none" | "move" | "rotate" | "resize";

export const InteractiveSticker: React.FC<InteractiveStickerProps> = ({
  sticker,
  containerRef,
  onUpdate,
  onRemove,
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragMode>("none");
  const rootRef = useRef<HTMLDivElement>(null);
  const stickerCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const movedDistanceRef = useRef<number>(0);

  const moveDragRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  }>({ startX: 0, startY: 0, initX: sticker.x, initY: sticker.y });

  const rotateDragRef = useRef<{
    startAngle: number;
    initRotation: number;
  }>({ startAngle: 0, initRotation: sticker.rotation });

  const resizeDragRef = useRef<{
    initDist: number;
    initScale: number;
  }>({ initDist: 1, initScale: sticker.scale });

  // Deselect when clicking outside the sticker
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };

    if (isSelected) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isSelected]);

  // Helper to get sticker center in screen pixels
  const getCenterPixels = () => {
    if (!rootRef.current) return { cx: 0, cy: 0 };
    const rect = rootRef.current.getBoundingClientRect();
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    };
  };

  // --- MOVE HANDLER ---
  const handleBodyPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-handle]")) return;
    e.stopPropagation();
    movedDistanceRef.current = 0;
    setActiveDrag("move");

    moveDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: sticker.x,
      initY: sticker.y,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  // --- ROTATE HANDLE POINTER DOWN ---
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag("rotate");
    const center = getCenterPixels();
    stickerCenterRef.current = center;

    const currentAngle =
      (Math.atan2(e.clientY - center.cy, e.clientX - center.cx) * 180) / Math.PI;

    rotateDragRef.current = {
      startAngle: currentAngle,
      initRotation: sticker.rotation,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  // --- RESIZE HANDLE POINTER DOWN ---
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag("resize");
    const center = getCenterPixels();
    stickerCenterRef.current = center;

    const dist = Math.hypot(e.clientX - center.cx, e.clientY - center.cy);
    resizeDragRef.current = {
      initDist: Math.max(10, dist),
      initScale: sticker.scale,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  // --- GLOBAL POINTER MOVE ---
  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeDrag === "none") return;

    if (activeDrag === "move") {
      if (!containerRef.current) return;
      const deltaPixelX = e.clientX - moveDragRef.current.startX;
      const deltaPixelY = e.clientY - moveDragRef.current.startY;
      movedDistanceRef.current = Math.hypot(deltaPixelX, deltaPixelY);

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = (deltaPixelX / rect.width) * 100;
      const deltaY = (deltaPixelY / rect.height) * 100;

      const newX = Math.min(95, Math.max(5, moveDragRef.current.initX + deltaX));
      const newY = Math.min(95, Math.max(5, moveDragRef.current.initY + deltaY));

      onUpdate({
        ...sticker,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
      });
    } else if (activeDrag === "rotate") {
      const center = stickerCenterRef.current;
      const currentAngle =
        (Math.atan2(e.clientY - center.cy, e.clientX - center.cx) * 180) / Math.PI;
      const deltaAngle = currentAngle - rotateDragRef.current.startAngle;
      let newRot = Math.round(rotateDragRef.current.initRotation + deltaAngle);

      // Normalize to [-180, 180]
      while (newRot > 180) newRot -= 360;
      while (newRot < -180) newRot += 360;

      // Snap to 0° within 4 degrees
      if (Math.abs(newRot) <= 4) newRot = 0;

      onUpdate({
        ...sticker,
        rotation: newRot,
      });
    } else if (activeDrag === "resize") {
      const center = stickerCenterRef.current;
      const currentDist = Math.hypot(e.clientX - center.cx, e.clientY - center.cy);
      const scaleMultiplier = currentDist / resizeDragRef.current.initDist;
      const newScale = Math.min(
        3.5,
        Math.max(0.4, resizeDragRef.current.initScale * scaleMultiplier)
      );

      onUpdate({
        ...sticker,
        scale: Math.round(newScale * 100) / 100,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag !== "none") {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      if (activeDrag === "move" && movedDistanceRef.current < 5) {
        // Simple tap / click toggles selection
        setIsSelected((prev) => !prev);
        audioManager.playGentleTap();
      }

      setActiveDrag("none");
    }
  };

  const handleDelete = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    audioManager.playGentleTap();
    setIsSelected(false);
    onRemove(sticker.id);
  };

  return (
    <div
      ref={rootRef}
      style={{
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
      }}
      className={`absolute z-30 select-none ${isSelected ? "z-50" : ""}`}
    >
      {/* Outer transform container for rotation & scale */}
      <div
        style={{
          transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
          transformOrigin: "center center",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative inline-flex items-center justify-center p-2 group"
      >
        {/* Selection Bounding Box with Dashed Border & Action Handles */}
        {isSelected && (
          <div className="absolute inset-0 border-2 border-dashed border-pink-500 rounded-xl pointer-events-none shadow-sm bg-pink-500/5">
            {/* Rotation Stalk Line connecting to top handle */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-pink-500" />
          </div>
        )}

        {/* --- ROTATE HANDLE (Top stalk) --- */}
        {isSelected && (
          <div
            data-handle="rotate"
            onPointerDown={handleRotatePointerDown}
            title="Drag with mouse to rotate"
            className="absolute -top-9 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white hover:bg-pink-50 text-pink-600 border-2 border-pink-500 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-115 transition-transform z-50 pointer-events-auto"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </div>
        )}

        {/* --- DELETE BUTTON (Top-Right Corner) --- */}
        {isSelected && (
          <button
            type="button"
            data-handle="delete"
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            title="Delete sticker"
            className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-115 transition-transform z-50 pointer-events-auto"
          >
            <X className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        )}

        {/* --- RESIZE HANDLES (Corners) --- */}
        {isSelected && (
          <>
            {/* Bottom-Right Corner (Primary Resize Handle) */}
            <div
              data-handle="resize"
              onPointerDown={handleResizePointerDown}
              title="Drag in/out to resize"
              className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-white hover:bg-pink-100 border-2 border-pink-600 shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-50 pointer-events-auto flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />
            </div>

            {/* Bottom-Left Corner */}
            <div
              data-handle="resize"
              onPointerDown={handleResizePointerDown}
              title="Drag in/out to resize"
              className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-white hover:bg-pink-100 border-2 border-pink-600 shadow-md cursor-nesw-resize hover:scale-125 transition-transform z-50 pointer-events-auto flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />
            </div>

            {/* Top-Left Corner */}
            <div
              data-handle="resize"
              onPointerDown={handleResizePointerDown}
              title="Drag in/out to resize"
              className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-white hover:bg-pink-100 border-2 border-pink-600 shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-50 pointer-events-auto flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />
            </div>
          </>
        )}

        {/* --- STICKER EMOJI BODY --- */}
        <div
          onPointerDown={handleBodyPointerDown}
          className="cursor-grab active:cursor-grabbing select-none inline-block p-1"
          title={isSelected ? "Drag to move sticker" : "Click to select sticker"}
        >
          <span className="text-4xl sm:text-5xl filter drop-shadow-md inline-block transform transition-transform group-hover:scale-105">
            {sticker.emoji}
          </span>
        </div>
      </div>
    </div>
  );
};


