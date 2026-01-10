import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

const DeveloperConsoleContext = createContext();

export const useDeveloperConsole = () => useContext(DeveloperConsoleContext);

export const DeveloperConsoleProvider = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);

    // Load logs from localStorage
    // Load logs from Server (replacing localStorage)
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        api.getDevLogs()
            .then(data => {
                // Ensure data is array
                if (Array.isArray(data)) {
                    // Parse details if string
                    const parsed = data.map(l => ({
                        ...l,
                        details: (typeof l.details === 'string' && (l.details.startsWith('{') || l.details.startsWith('[')))
                            ? JSON.parse(l.details)
                            : l.details
                    }));
                    setLogs(parsed);
                }
            })
            .catch(err => console.error("Failed to load dev logs:", err));
    }, []);

    // Load filters from localStorage (Filters can remain local preference)
    const [filters, setFilters] = useState(() => {
        try {
            const savedFilters = localStorage.getItem('met_dev_console_filters');
            return savedFilters ? JSON.parse(savedFilters) : {
                WS: true,
                API: true,
                AUTH: true,
                TX: true, // Transaction
                NAV: true, // Navigation/Routing
                STATE: true, // State changes
                ERROR: true,
                OTHER: true
            };
        } catch (_e) {
            return {
                WS: true,
                API: true,
                AUTH: true,
                TX: true,
                NAV: true,
                STATE: true,
                ERROR: true,
                OTHER: true
            };
        }
    });

    // Save filters to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('met_dev_console_filters', JSON.stringify(filters));
    }, [filters]);

    // Save filters to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('met_dev_console_filters', JSON.stringify(filters));
    }, [filters]);

    const log = useCallback((category = 'OTHER', message, details = null) => {
        const newLog = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            category,
            message,
            details
        };

        // Optimistic UI update
        setLogs(prevLogs => {
            // Keep last 50000 logs (User Request)
            return [...prevLogs, newLog].slice(-50000);
        });

        // Persist to Server
        api.saveDevLog(newLog).catch(e => console.error("Failed to save log:", e));

    }, []);

    const toggleConsole = () => setIsVisible(prev => !prev);

    const toggleFilter = (category) => {
        setFilters(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const clearLogs = () => {
        setLogs([]);
        api.clearDevLogs().catch(e => console.error("Failed to clear logs:", e));
    };

    return (
        <DeveloperConsoleContext.Provider value={{
            isVisible,
            toggleConsole,
            logs,
            log,
            filters,
            toggleFilter,
            clearLogs
        }}>
            {children}
            <DeveloperConsoleUI />
        </DeveloperConsoleContext.Provider>
    );
};

// Internal Component for the UI to keep everything self-contained in the Provider if desired, 
// or split it out. For simplicity, let's keep the UI logic here but render it only if visible.
const DeveloperConsoleUI = () => {
    const { isVisible, logs, toggleConsole, filters, toggleFilter, clearLogs } = useDeveloperConsole();
    const [isMinimized, setIsMinimized] = useState(false);
    const logsEndRef = React.useRef(null);

    // Auto-scroll
    useEffect(() => {
        if (isVisible && !isMinimized && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isVisible, isMinimized]);

    if (!isVisible) return null;

    const filteredLogs = logs.filter(log => filters[log.category] !== false);

    const getCategoryColor = (cat) => {
        switch (cat) {
            case 'WS': return 'text-blue-400';
            case 'API': return 'text-cyan-400';
            case 'AUTH': return 'text-yellow-400';
            case 'TX': return 'text-green-400';
            case 'ERROR': return 'text-red-500 font-bold';
            case 'NAV': return 'text-purple-400';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-700 shadow-2xl z-[9999] transition-all duration-300 flex flex-col font-mono text-sm ${isMinimized ? 'h-12' : 'h-[50vh]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                    <span className="font-bold text-green-500">DevConsole</span>
                    <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                        {Object.keys(filters).map(cat => (
                            <label key={cat} className={`flex items-center gap-1 cursor-pointer select-none text-xs hover:text-white ${filters[cat] ? getCategoryColor(cat) : 'text-slate-600'}`}>
                                <input
                                    type="checkbox"
                                    checked={filters[cat]}
                                    onChange={() => toggleFilter(cat)}
                                    className="hidden"
                                />
                                [{filters[cat] ? 'x' : ' '}] {cat}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 pl-4">
                    <button onClick={clearLogs} className="text-xs text-slate-400 hover:text-red-400 px-2">Clear</button>
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-slate-400 hover:text-white px-2">
                        {isMinimized ? 'Expand' : 'Minimize'}
                    </button>
                    <button onClick={toggleConsole} className="text-slate-400 hover:text-red-400 px-2">Close</button>
                </div>
            </div>

            {/* Logs Area */}
            {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {filteredLogs.length === 0 ? (
                        <div className="text-slate-600 italic">No logs captured...</div>
                    ) : (
                        filteredLogs.map(log => (
                            <LogItem key={log.id} log={log} getCategoryColor={getCategoryColor} />
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            )}
        </div>
    );
};

const LogItem = ({ log, getCategoryColor }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="group">
            <div
                className={`flex gap-3 hover:bg-slate-900/50 p-0.5 rounded cursor-pointer ${log.category === 'ERROR' ? 'bg-red-900/10' : ''}`}
                onClick={() => log.details && setExpanded(!expanded)}
            >
                <span className="text-slate-500 min-w-[80px]">{log.timestamp}</span>
                <span className={`font-bold w-[60px] text-center ${getCategoryColor(log.category)}`}>{log.category}</span>
                <span className="text-slate-300 flex-1 truncate">{log.message}</span>
                {log.details && (
                    <span className="text-xs text-slate-600">
                        {expanded ? '[-]' : '[+]'}
                    </span>
                )}
            </div>
            {expanded && log.details && (
                <div className="pl-[155px] pr-4 py-1 text-xs">
                    <pre className="bg-slate-900/80 p-2 rounded text-slate-400 overflow-x-auto border border-slate-800">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default DeveloperConsoleProvider;
