import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScrollableListProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

const ScrollableList = ({ children, className, maxHeight = 'max-h-60' }: ScrollableListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const hasScroll = el.scrollHeight > el.clientHeight + 8;
    setCanScroll(hasScroll);
    if (hasScroll) {
      const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setScrollProgress(progress);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ top: amount, behavior: 'smooth' });
  };

  const atBottom = scrollProgress > 0.95;

  return (
    <div className="relative flex gap-2">
      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn(maxHeight, 'overflow-y-auto flex-1', className)}
      >
        {children}
      </div>

      {/* Scroll track with arrows */}
      {canScroll && (
        <div className="flex flex-col items-center gap-1 shrink-0 self-stretch py-0.5 justify-between">
          {/* Up arrow */}
          <button
            onClick={() => scrollBy(-100)}
            onTouchEnd={(e) => { e.preventDefault(); scrollBy(-100); }}
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-md transition-colors touch-manipulation",
              scrollProgress < 0.05
                ? "text-muted-foreground/30 cursor-default"
                : "text-foreground hover:bg-accent active:bg-accent/80"
            )}
            disabled={scrollProgress < 0.05}
          >
            <svg width="40" height="40" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 3L12 10H2L7 3Z" fill="currentColor" />
            </svg>
          </button>

          {/* Down arrow */}
          <button
            onClick={() => scrollBy(100)}
            onTouchEnd={(e) => { e.preventDefault(); scrollBy(100); }}
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-md transition-colors touch-manipulation",
              atBottom
                ? "text-muted-foreground/30 cursor-default"
                : "text-foreground hover:bg-accent active:bg-accent/80"
            )}
            disabled={atBottom}
          >
            <svg width="40" height="40" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 11L2 4H12L7 11Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ScrollableList;
