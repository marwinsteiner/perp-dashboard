import React, { useState, useRef, useEffect } from 'react';

interface FloatingWindowProps {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  onClose: () => void;
  onToggleDock: () => void; // Maximize/Dock
  onMinimize: () => void;
  onFocus: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  children: React.ReactNode;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  id, title, x, y, w, h, zIndex,
  onClose, onToggleDock, onMinimize, onFocus, onMove, onResize, children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ w: 0, h: 0, x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onFocus();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - x,
      y: e.clientY - y
    });
  };

  // Resize Logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    setIsResizing(true);
    setResizeStart({ w, h, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onMove(id, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        // Enforce min size
        onResize(id, Math.max(300, resizeStart.w + deltaX), Math.max(200, resizeStart.h + deltaY));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, id, onMove, onResize]);

  return (
    <div 
      ref={windowRef}
      className="fixed flex flex-col bg-black border border-cyan-800 shadow-2xl overflow-hidden"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        zIndex: zIndex,
        boxShadow: '0 0 20px rgba(0,0,0,0.8)'
      }}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div 
        className="bg-neutral-900 border-b border-cyan-900 flex justify-between items-center px-2 py-1 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <span className="text-cyan-500 font-bold text-xs uppercase tracking-wider truncate mr-4">
          {title}
        </span>
        <div className="flex gap-1 items-center" onMouseDown={(e) => e.stopPropagation()}>
          <button 
            onClick={onMinimize}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-sm"
            title="Minimize"
          >
            _
          </button>
          <button 
            onClick={onToggleDock}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-sm text-[10px]"
            title="Dock / Maximize"
          >
            □
          </button>
          <button 
            onClick={onClose}
            className="w-4 h-4 flex items-center justify-center text-red-500 hover:text-white bg-gray-800 hover:bg-red-700 rounded-sm"
            title="Close"
          >
            x
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-black relative">
        {children}
        {/* Interaction blocker during drag/resize to prevent iframe/canvas stealing mouse */}
        {(isDragging || isResizing) && <div className="absolute inset-0 z-50 bg-transparent" />}
      </div>

      {/* Resize Handle (Simple corner) */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-50"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="w-1.5 h-1.5 bg-cyan-700/50" />
      </div>
    </div>
  );
};

export default FloatingWindow;