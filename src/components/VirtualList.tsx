import React, { useRef, useState, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number; // Estimated height for collapsed items
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: string; // e.g. "max-h-[60vh]" or "h-[500px]"
  buffer?: number;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = "max-h-[65vh]",
  buffer = 5
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(500);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      setClientHeight(container.clientHeight);
      
      // Setup a ResizeObserver to handle window resizing correctly
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver((entries) => {
          for (let entry of entries) {
            setClientHeight(entry.contentRect.height || container.clientHeight);
          }
        });
        resizeObserver.observe(container);
        return () => {
          container.removeEventListener('scroll', handleScroll);
          resizeObserver.disconnect();
        };
      }
    }
    
    return () => {
      container?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Total content height
  const totalHeight = items.length * itemHeight;

  // Calculate visible range indices
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(items.length - 1, Math.floor((scrollTop + clientHeight) / itemHeight) + buffer);

  // Items to display in the DOM
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Offsets
  const offsetTop = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto w-full pr-1 scroll-smooth ${containerHeight}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div 
        style={{ 
          height: `${totalHeight}px`, 
          position: 'relative', 
          width: '100%' 
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetTop}px)`,
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px' // Matches the gap-3 (12px) space-y-3 of the original layout
          }}
        >
          {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
}
