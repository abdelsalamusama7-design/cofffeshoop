import { useState, useRef, useEffect, ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
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
        <div className="flex flex-col items-center gap-0.5 shrink-0 self-stretch py-0.5">
          {/* Up arrow */}
          <button
            onClick={() => scrollBy(-100)}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded-full transition-colors",
              scrollProgress < 0.05
                ? "text-muted-foreground/30 cursor-default"
                : "text-primary hover:bg-primary/10 active:bg-primary/20"
            )}
            disabled={scrollProgress < 0.05}
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>

          {/* Track */}
          <div className="relative w-3 flex-1 rounded-full bg-primary/15 overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickRatio = (e.clientY - rect.top) / rect.height;
              const el = scrollRef.current;
              if (el) {
                el.scrollTo({ top: clickRatio * (el.scrollHeight - el.clientHeight), behavior: 'smooth' });
              }
            }}
          >
            <div
              className="absolute left-0 right-0 w-full rounded-full bg-primary transition-all duration-200"
              style={{
                height: '25%',
                top: `${scrollProgress * 75}%`,
              }}
            />
          </div>

          {/* Down arrow */}
          <button
            onClick={() => scrollBy(100)}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded-full transition-colors",
              atBottom
                ? "text-muted-foreground/30 cursor-default"
                : "text-primary hover:bg-primary/10 active:bg-primary/20"
            )}
            disabled={atBottom}
          >
            <ArrowDown size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ScrollableList;
