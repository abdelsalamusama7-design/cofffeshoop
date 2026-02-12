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
      {/* Up fade + arrow */}
      {canScrollUp && (
        <>
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none rounded-t-xl" />
          <button
            onClick={() => scrollBy(-120)}
            className="absolute left-1/2 -translate-x-1/2 top-0 z-20 w-8 h-5 rounded-b-lg bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:bg-primary/80 transition-all animate-bounce"
            type="button"
          >
            <ChevronUp size={14} strokeWidth={3} />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn(maxHeight, 'overflow-y-auto', className)}
      >
        {children}
      </div>

      {/* Down fade + arrow */}
      {canScrollDown && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none rounded-b-xl" />
          <button
            onClick={() => scrollBy(120)}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20 w-8 h-5 rounded-t-lg bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:bg-primary/80 transition-all animate-bounce"
            type="button"
          >
            <ChevronDown size={14} strokeWidth={3} />
          </button>
        </>
      )}
    </div>
  );
};

export default ScrollableList;
