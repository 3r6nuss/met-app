import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DRAFT_TTL_MS = 2 * 24 * 60 * 60 * 1000;

function readDraft(storageKey) {
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey));
        if (!stored || stored.expiresAt <= Date.now()) {
            localStorage.removeItem(storageKey);
            return null;
        }
        return stored.data;
    } catch (_error) {
        localStorage.removeItem(storageKey);
        return null;
    }
}

export function getBookingDraft(scope, userId) {
    return readDraft(`met_booking_draft:${userId || 'anonymous'}:${scope}`);
}

export function useBookingDraft({ scope, userId, draft, hasChanges, onClear, formRef }) {
    const navigate = useNavigate();
    const storageKey = `met_booking_draft:${userId || 'anonymous'}:${scope}`;
    const [savedDraft] = useState(() => readDraft(storageKey));
    const [pendingDestination, setPendingDestination] = useState(null);
    const isDirtyRef = useRef(hasChanges);

    useEffect(() => {
        isDirtyRef.current = hasChanges;
        if (!hasChanges) {
            localStorage.removeItem(storageKey);
            return;
        }

        localStorage.setItem(storageKey, JSON.stringify({
            data: draft,
            expiresAt: Date.now() + DRAFT_TTL_MS
        }));
    }, [draft, hasChanges, storageKey]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!isDirtyRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => {
        const handleLinkClick = (event) => {
            const link = event.target.closest('a[href]');
            if (!link || !isDirtyRef.current || event.defaultPrevented || event.button !== 0) return;

            const destination = new URL(link.href, window.location.href);
            if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;

            event.preventDefault();
            event.stopPropagation();
            setPendingDestination(`${destination.pathname}${destination.search}${destination.hash}`);
        };

        document.addEventListener('click', handleLinkClick, true);
        return () => document.removeEventListener('click', handleLinkClick, true);
    }, []);

    const discardDraft = () => {
        localStorage.removeItem(storageKey);
        onClear();
    };

    const continueNavigation = () => {
        const destination = pendingDestination;
        discardDraft();
        setPendingDestination(null);
        if (destination) navigate(destination);
    };

    const prompt = pendingDestination ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="unsaved-booking-title">
            <div className="w-full max-w-md rounded-lg border border-amber-400/30 bg-slate-900 p-6 shadow-2xl">
                <h2 id="unsaved-booking-title" className="text-lg font-semibold text-slate-100">Nicht gespeicherte Buchung</h2>
                <p className="mt-2 text-sm text-slate-300">Du hast noch nicht gespeicherte Angaben. Möchtest du die Buchung absenden?</p>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button type="button" onClick={() => setPendingDestination(null)} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600">Abbrechen</button>
                    <button type="button" onClick={continueNavigation} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">Verwerfen</button>
                    <button type="button" onClick={() => formRef.current?.requestSubmit()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Absenden</button>
                </div>
            </div>
        </div>
    ) : null;

    return { savedDraft, discardDraft, prompt };
}
