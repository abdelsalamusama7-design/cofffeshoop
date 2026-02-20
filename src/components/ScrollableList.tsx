import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScrollableListProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  alwaysShowArrows?: boolean;
  arrowClassName?: string;
  vertical?: boolean;
}

const ScrollableList = ({ children, className, maxHeight = 'max-h-60', alwaysShowArrows = false, arrowClassName, vertical = false }: ScrollableListProps) => {
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

  if (vertical) {
    return (
      <div className="relative flex flex-col h-full">
        {(canScroll || alwaysShowArrows) && (
          <button
            onClick={() => scrollBy(-100)}
            onTouchEnd={(e) => { e.preventDefault(); scrollBy(-100); }}
            className={cn(
              "w-full h-12 flex items-center justify-center rounded-md transition-colors touch-manipulation shrink-0",
              scrollProgress < 0.05
                ? "text-muted-foreground/30 cursor-default"
                : "text-foreground hover:bg-accent active:bg-accent/80",
              arrowClassName
            )}
            disabled={scrollProgress < 0.05}
          >
            <svg width="40" height="40" viewBox="0 0 14 14" fill="none"><path d="M7 2L13 11H1L7 2Z" fill="currentColor" /></svg>
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className={cn('overflow-y-auto flex-1 min-h-0', className)}
        >
          {children}
        </div>
        {(canScroll || alwaysShowArrows) && (
          <button
            onClick={() => scrollBy(100)}
            onTouchEnd={(e) => { e.preventDefault(); scrollBy(100); }}
            className={cn(
              "w-full h-12 flex items-center justify-center rounded-md transition-colors touch-manipulation shrink-0",
              atBottom
                ? "text-muted-foreground/30 cursor-default"
                : "text-foreground hover:bg-accent active:bg-accent/80",
              arrowClassName
            )}
            disabled={atBottom}
          >
            <svg width="40" height="40" viewBox="0 0 14 14" fill="none"><path d="M7 12L1 3H13L7 12Z" fill="currentColor" /></svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex gap-2">
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn(maxHeight, 'overflow-y-auto flex-1', className)}
      >
        {children}
      </div>
      {(canScroll || alwaysShowArrows) && (
        <div className="flex flex-col items-center gap-1 shrink-0 self-stretch py-0.5 justify-between">
          <button
            onClick={() => scrollBy(-100)}
            onTouchEnd={(e) => { e.preventDefault(); scrollBy(-100); }}
            className={cn(
              "w-14 h-14 flex items-center justify-center rounded-md transition-colors touch-manipulation",
              scrollProgress < 0.05
                ? "text-muted-foreground/30 cursor-default"
                : "text-foreground hover:bg-accent active:bg-accent/80",
              arrowClassName
            )}
            disabled={scrollProgress < 0.05}
          >
            <svg width="48" height="48" viewBox="0 0 14 14" fill="none"><path d="M7 2L13 11H1L7 2Z" fill="currentColor" /></svg>
          </button>
          <button
            onClick={() => scrollBy(100)}
            onTouchEnd={(e) => { e.preventDefault(); scrollBy(100); }}
            className={cn(
              "w-14 h-14 flex items-center justify-center rounded-md transition-colors touch-manipulation",
              atBottom
                ? "text-muted-foreground/30 cursor-default"
                : "text-foreground hover:bg-accent active:bg-accent/80",
              arrowClassName
            )}
            disabled={atBottom}
          >
            <svg width="48" height="48" viewBox="0 0 14 14" fill="none"><path d="M7 12L1 3H13L7 12Z" fill="currentColor" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ScrollableList;
