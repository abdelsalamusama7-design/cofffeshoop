import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollableListProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

const ScrollableList = ({ children, className, maxHeight = 'max-h-60' }: ScrollableListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 8);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
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

  return (
    <div className="relative">
      {/* Up arrow */}
      {canScrollUp && (
        <button
          onClick={() => scrollBy(-120)}
          className="absolute -left-1 top-1 z-10 w-7 h-7 rounded-full bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary transition-colors"
          type="button"
        >
          <ChevronUp size={16} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn(maxHeight, 'overflow-y-auto', className)}
      >
        {children}
      </div>

      {/* Down arrow */}
      {canScrollDown && (
        <button
          onClick={() => scrollBy(120)}
          className="absolute -left-1 bottom-1 z-10 w-7 h-7 rounded-full bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary transition-colors"
          type="button"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
};

export default ScrollableList;
