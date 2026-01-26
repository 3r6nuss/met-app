// API URL constants
export const API_URL = '/api';

// Transaction types
export const TRANSACTION_TYPES = {
    IN: 'in',
    OUT: 'out'
};

// Transaction categories
export const TRANSACTION_CATEGORIES = {
    INTERNAL: 'internal',
    TRADE: 'trade',
    REVERT: 'revert'
};

// Transaction statuses
export const TRANSACTION_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    OUTSTANDING: 'outstanding',
    REVERTED: 'reverted'
};

// User roles
export const USER_ROLES = {
    ADMINISTRATOR: 'Administrator',
    BUCHHALTUNG: 'Buchhaltung',
    FUHRPARKMANAGER: 'Fuhrparkmanager',
    LAGER: 'Lager',
    HAENDLER: 'Händler',
    PENDING: 'Pending'
};

// Employee statuses
export const EMPLOYEE_STATUS = {
    ACTIVE: 'active',
    FIRED: 'fired'
};

// Priority levels
export const PRIORITY_LEVELS = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

// Local storage keys
export const STORAGE_KEYS = {
    DEPOSITOR: 'met_depositor',
    CUSTOM_NAME: 'met_custom_name',
    DEV_CONSOLE_FILTERS: 'met_dev_console_filters'
};

// Date formatting options (German locale)
export const DATE_FORMAT_OPTIONS = {
    FULL: {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    },
    DATE_ONLY: {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    },
    TIME_ONLY: {
        hour: '2-digit',
        minute: '2-digit'
    }
};

// Developer console categories
export const DEV_CONSOLE_CATEGORIES = {
    WS: 'WS',
    API: 'API',
    AUTH: 'AUTH',
    TX: 'TX',
    NAV: 'NAV',
    STATE: 'STATE',
    ERROR: 'ERROR',
    OTHER: 'OTHER'
};
