import { useState, useEffect, useRef, useCallback } from "react";
import { Pause, Play, Square, GripHorizontal } from "lucide-react";
import { useFloatingTimerStore } from "../../store/floatingTimerStore";
import { useTimerSync } from "../../hooks/useTimerSync";
import LogTimePopover from "./LogTimePopover";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const POSITION_KEY = "jumpstart_timer_pos";

function loadPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { x: window.innerWidth - 260, y: window.innerHeight - 80 };
}

function savePosition(pos: { x: number; y: number }) {
  localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
}

export default function FloatingTimer() {
  const { status, topicId, topicName, displaySeconds, pauseTimer, stopTimer } = useFloatingTimerStore();
  useTimerSync();

  const [pos, setPos] = useState(loadPosition);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPopover, setShowPopover] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    savePosition(pos);
  }, [pos]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (timerRef.current) {
      const rect = timerRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 220, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 44, e.clientY - dragOffset.y)),
      });
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, dragOffset]);

  if (status === "IDLE" || !topicId) return null;

  const truncatedName = topicName.length > 16 ? topicName.slice(0, 14) + "…" : topicName;

  return (
    <div
      ref={timerRef}
      className="fixed z-[9999] select-none"
      style={{
        left: pos.x,
        top: pos.y,
        cursor: dragging ? "grabbing" : "default",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{
          height: 44,
          minWidth: 220,
          borderRadius: 24,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <span
          onMouseDown={handleMouseDown}
          className="text-[#666] hover:text-[#333] transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripHorizontal size={14} />
        </span>

        <button
          onClick={() => setShowPopover(!showPopover)}
          className="font-mono text-[13px] font-bold tracking-wider text-[#222] hover:text-[#000] transition-colors"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatTime(displaySeconds)}
        </button>

        <span className="text-[11px] text-[#666] truncate max-w-[100px] hidden sm:inline">{truncatedName}</span>

        {status === "RUNNING" ? (
          <button
            onClick={() => pauseTimer()}
            className="p-1 rounded-full hover:bg-black/10 transition-colors text-[#555] hover:text-[#222]"
            title="Pause"
          >
            <Pause size={14} />
          </button>
        ) : (
          <span className="text-[10px] text-[#888] font-medium px-1">PAUSED</span>
        )}

        <div className="relative">
          <button
            onClick={() => setShowStopConfirm(!showStopConfirm)}
            className="p-1 rounded-full hover:bg-black/10 transition-colors text-[#555] hover:text-[#d32f2f]"
            title="Stop"
          >
            <Square size={14} />
          </button>
          {showStopConfirm && (
            <div className="absolute bottom-full mb-2 right-0 z-[9999] w-40 rounded-lg border border-slate-600 bg-ink-900 shadow-xl p-3">
              <p className="text-[11px] text-mist-200 mb-2">Stop timer?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { stopTimer(); setShowStopConfirm(false); }}
                  className="flex-1 rounded-lg bg-ember-500 text-ink-900 text-[11px] font-medium py-1 hover:bg-ember-400"
                >
                  Stop
                </button>
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[11px] py-1 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPopover && topicId && (
        <LogTimePopover topicId={topicId} onClose={() => setShowPopover(false)} />
      )}
    </div>
  );
}
