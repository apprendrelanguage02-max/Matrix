import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY > 5) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) {
      const dist = Math.min(dy * 0.5, THRESHOLD * 1.5);
      setPullDistance(dist);
      setPulling(dist >= THRESHOLD);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    isDragging.current = false;
    if (pulling && !refreshing && onRefresh) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try { await onRefresh(); } catch {}
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pulling, refreshing, onRefresh]);

  const rotation = Math.min(pullDistance / THRESHOLD * 360, 360);
  const opacity = Math.min(pullDistance / (THRESHOLD * 0.6), 1);

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200 bg-zinc-100"
        style={{ height: refreshing ? 50 : pullDistance > 10 ? Math.min(pullDistance, 60) : 0, opacity }}
      >
        <Loader2
          className={`w-6 h-6 text-[#FF6600] ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: refreshing ? undefined : `rotate(${rotation}deg)`, transition: refreshing ? undefined : "none" }}
        />
      </div>
      {children}
    </div>
  );
}
