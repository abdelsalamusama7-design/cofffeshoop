import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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
      {/* Scroll track - full height */}
      {canScroll && (
        <div className="flex flex-col items-center shrink-0 self-stretch">
          {/* Full-height track */}
          <div className="relative w-3 h-full min-h-full rounded-full bg-primary/15 overflow-hidden">
            {/* Progress thumb */}
            <div
              className="absolute left-0 right-0 w-full rounded-full bg-primary transition-all duration-200"
              style={{
                height: '25%',
                top: `${scrollProgress * 75}%`,
              }}
            />
          </div>
          {/* Arrow button at bottom */}
          <button
            onClick={() => scrollBy(atBottom ? -9999 : 120)}
            className="mt-1 w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/80 transition-all"
            type="button"
          >
            <ChevronDown
              size={16}
              strokeWidth={3}
              className={cn('transition-transform duration-200', atBottom && 'rotate-180')}
            />
          </button>
        </div>
      )}

      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn(maxHeight, 'overflow-y-auto flex-1', className)}
      >
        {children}
      </div>
    </div>
  );
};

export default ScrollableList;
