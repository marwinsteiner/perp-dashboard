
import React, { useState } from 'react';
import OrderTicket from './OrderTicket';
import WorkingBlotter from './WorkingBlotter';

interface OMSWidgetProps {
    contextData?: any; 
    onPopOut?: (type: 'TICKET' | 'BLOTTER') => void;
}

const OMSWidget: React.FC<OMSWidgetProps> = ({ contextData, onPopOut }) => {
    // If the widget is just a TICKET or just a BLOTTER, we render only that.
    // But since this is the "OMS" view, it usually implies both. 
    // However, for detachable behavior, the parent might render just one of them via context or type.
    // Given the architecture, "OMSWidget" is the "combined" view. 
    // We will support a local state to toggle visibility of Blotter for the "toggle" requirement.
    
    const [showBlotter, setShowBlotter] = useState(true);

    const handlePopOutTicket = () => {
        if (onPopOut) onPopOut('TICKET');
    };

    const handlePopOutBlotter = () => {
        setShowBlotter(false); // Hide locally
        if (onPopOut) onPopOut('BLOTTER');
    };

    return (
        <div className="h-full flex bg-[#121212] font-mono text-xs overflow-hidden relative">
            
            {/* LEFT: TICKET PANEL */}
            <div className="flex-none border-r border-gray-800 h-full flex flex-col">
                <OrderTicket contextData={contextData} onPopOut={handlePopOutTicket} />
            </div>

            {/* RIGHT: BLOTTER (Optional) */}
            {showBlotter && (
                 <div className="flex-1 flex flex-col min-w-0 h-full">
                     <WorkingBlotter onPopOut={handlePopOutBlotter} />
                 </div>
            )}

            {/* Toggle Button if hidden */}
            {!showBlotter && (
                <button 
                    onClick={() => setShowBlotter(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-900 border-l border-t border-b border-gray-700 text-gray-400 p-1 rounded-l text-[10px] writing-mode-vertical hover:bg-gray-800 hover:text-white"
                >
                    SHOW BLOTTER
                </button>
            )}
        </div>
    );
};

export default OMSWidget;
