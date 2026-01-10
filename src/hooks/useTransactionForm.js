import { useState, useMemo, useCallback } from 'react';
import { STORAGE_KEYS, TRANSACTION_CATEGORIES } from '../constants';

/**
 * Shared hook for CheckInForm and CheckOutForm common logic.
 * Handles depositor selection, date management, and price lookup.
 * 
 * @param {Array} employees - List of employees
 * @param {Array} prices - Price list data
 * @param {Array} inventory - Inventory items
 * @returns {object} Form state and handlers
 */
export function useTransactionForm(employees = [], prices = [], _inventory = []) {
    // Initialize date with lazy initialization (no useEffect needed)
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });

    // Initialize depositor from localStorage with lazy initialization
    const [depositor, setDepositor] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.DEPOSITOR);
        return saved || '';
    });

    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState(TRANSACTION_CATEGORIES.INTERNAL);

    // Filter active employees only
    const activeEmployees = useMemo(() => {
        return employees.filter(emp => {
            const empObj = typeof emp === 'string' ? { name: emp, status: 'active' } : emp;
            return empObj.status !== 'fired';
        });
    }, [employees]);

    // Get employee name (handles both string and object formats)
    const getEmployeeName = useCallback((emp) => {
        return typeof emp === 'string' ? emp : emp.name;
    }, []);

    // Save depositor to localStorage when it changes
    const handleDepositorChange = useCallback((value) => {
        setDepositor(value);
        localStorage.setItem(STORAGE_KEYS.DEPOSITOR, value);
    }, []);

    // Lookup price for selected item
    const lookupPrice = useCallback((item) => {
        if (!item) return { ek: 0, vk: 0 };
        const priceItem = prices.find(p => p.name === item.name);
        return {
            ek: priceItem?.ek || 0,
            vk: priceItem?.vk || 0,
            lohn: priceItem?.lohn || 0
        };
    }, [prices]);

    // Handle item selection and auto-fill price
    const handleItemSelect = useCallback((item) => {
        setSelectedItem(item);
        if (item) {
            const itemPrices = lookupPrice(item);
            // Could auto-set price based on category here
            setPrice(itemPrices.vk?.toString() || '');
        } else {
            setPrice('');
        }
    }, [lookupPrice]);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setSelectedItem(null);
        setQuantity(1);
        setPrice('');
        // Reset date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setSelectedDate(now.toISOString().slice(0, 16));
    }, []);

    return {
        // State
        selectedDate,
        depositor,
        selectedItem,
        quantity,
        price,
        category,
        activeEmployees,

        // Setters
        setSelectedDate,
        setQuantity,
        setPrice,
        setCategory,

        // Handlers
        handleDepositorChange,
        handleItemSelect,
        getEmployeeName,
        lookupPrice,
        resetForm
    };
}

export default useTransactionForm;
