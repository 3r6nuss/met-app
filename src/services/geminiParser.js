/**
 * FiveM Bossmenü Log Parser
 * 
 * Primary:  Deterministic regex parser for known Bossmenü formats
 * Fallback: Gemini AI for unrecognized formats
 * 
 * Known formats:
 *   Abhebung:  "NAME hat BETRAG$ vom Konto abgehoben. Grund: REASON"
 *   Rechnung:  "KUNDE hat eine Rechnung bezahlt. Aussteller: NAME, Betrag: BETRAG$, Grund: REASON"
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI (lazy — only used as fallback)
let genAI = null;
function getGenAI() {
    if (!genAI && process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a German-formatted number string like "480.000" → 480000
 */
function parseGermanNumber(str) {
    if (!str) return null;
    // Remove dots (thousands separator) and replace comma with dot (decimal)
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

/**
 * Extract a reference ID from a reason string.
 * Supports formats like:
 *   "AK 3OI1P3 (Farm produkte)" → "3OI1P3"
 *   "VK ABC123"                  → "ABC123"
 *   "Ankauf 8HZV36"             → "8HZV36"
 *   "Verkauf XY12AB (Waffen)"   → "XY12AB"
 *   "3OI1P3"                    → "3OI1P3"
 */
function extractReferenceId(reason) {
    if (!reason) return null;

    // Pattern 1: Prefixed with AK/VK/Ankauf/Verkauf + space + CODE
    const prefixMatch = reason.match(/(?:AK|VK|Ankauf|Verkauf|An-\s*und\s*Verkauf)\s+([A-Z0-9]{4,8})/i);
    if (prefixMatch) return prefixMatch[1].toUpperCase();

    // Pattern 2: Standalone code (4-8 alphanumeric chars, must contain at least one digit),
    // possibly followed by parenthesized text
    const standaloneMatch = reason.match(/\b((?=[A-Z0-9]*\d)[A-Z0-9]{4,8})\s*(?:\(|$)/i);
    if (standaloneMatch) return standaloneMatch[1].toUpperCase();

    // Pattern 3: Code at end of string (must contain at least one digit)
    const endMatch = reason.match(/\b((?=[A-Z0-9]*\d)[A-Z0-9]{4,8})$/i);
    if (endMatch) return endMatch[1].toUpperCase();

    return null;
}

/**
 * Determine trade action from reason text
 */
function extractTradeAction(reason) {
    if (!reason) return null;
    const upper = reason.toUpperCase();
    if (upper.startsWith('AK') || upper.includes('ANKAUF') || upper.includes('EINKAUF')) return 'ankauf';
    if (upper.startsWith('VK') || upper.includes('VERKAUF')) return 'verkauf';
    if (upper.includes('AN- UND VERKAUF') || upper.includes('AN-UND VERKAUF')) return 'ankauf'; // default
    return null;
}

// ─── Primary: Deterministic Regex Parser ─────────────────────────────────────

/**
 * Parse a Bossmenü log message using deterministic regex patterns.
 * Returns null if the message doesn't match any known format (→ triggers AI fallback).
 */
export function parseLogWithRegex(rawContent) {
    if (!rawContent || !rawContent.trim()) return null;

    const result = {
        type: null,
        employee: null,
        customer: null,
        amount: null,
        reason: null,
        reference_id: null,
        trade_action: null,
        category_desc: null,
        ausgestellt_date: null,
        items: [],
        timestamp: null,
        parseMethod: 'regex'
    };

    // ── Abhebung (Cash withdrawal for purchases) ──
    // Format: "NAME hat BETRAG$ vom Konto abgehoben. Grund: REASON"
    // Note: The embed often has "Abhebung" as title on a separate line before the actual text
    const contentWithoutTitle = rawContent.replace(/^(?:Abhebung|Einzahlung|Rechnung|Rechnung bezahlt)\s*[\r\n]+/i, '').trim();
    const abhebungMatch = contentWithoutTitle.match(
        /^([A-Za-zÀ-ÿ\s]+?)\s+hat\s+([\d.,]+)\$?\s+vom\s+Konto\s+abgehoben/i
    );

    if (abhebungMatch) {
        result.type = 'abhebung';
        result.employee = abhebungMatch[1].trim();
        result.amount = parseGermanNumber(abhebungMatch[2]);

        // Extract reason
        const grundMatch = rawContent.match(/Grund:\s*(.+?)(?:\n|$)/i);
        if (grundMatch) {
            result.reason = grundMatch[1].trim();
            result.reference_id = extractReferenceId(result.reason);
            result.trade_action = extractTradeAction(result.reason) || 'ankauf';

            // Extract item description (everything after the code, in parentheses)
            const itemDescMatch = result.reason.match(/\(([^)]+)\)/);
            if (itemDescMatch) {
                result.category_desc = itemDescMatch[1].trim();
            }

            const action = result.trade_action;
            if (action) {
                result.items.push({
                    name: result.category_desc || result.reason,
                    action,
                    quantity: null
                });
            }
        }

        // Extract timestamp if present
        const zeitMatch = rawContent.match(/(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/);
        if (zeitMatch) result.timestamp = zeitMatch[1];

        return result;
    }

    // ── Rechnung bezahlt (Invoice paid — customer sale) ──
    // Format: "KUNDE hat eine Rechnung bezahlt. Aussteller: NAME, Betrag: BETRAG$, Grund: REASON"
    // Or embed fields: Aussteller, Betrag, Grund
    const rechnungMatch = contentWithoutTitle.match(
        /^([A-Za-zÀ-ÿ\s]+?)\s+hat\s+(?:eine\s+)?Rechnung\s+bezahlt/i
    );

    if (rechnungMatch) {
        result.type = 'rechnung';
        result.customer = rechnungMatch[1].trim();

        const ausstellerMatch = rawContent.match(/Aussteller:\s*([A-Za-zÀ-ÿ\s]+?)(?:\n|,|$)/i);
        if (ausstellerMatch) result.employee = ausstellerMatch[1].trim();

        const betragMatch = rawContent.match(/Betrag:\s*([\d.,]+)\$?/i);
        if (betragMatch) result.amount = parseGermanNumber(betragMatch[1]);

        const ausgestelltMatch = rawContent.match(/Ausgestellt:\s*(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/i);
        if (ausgestelltMatch) result.ausgestellt_date = ausgestelltMatch[1];

        const grundMatch = rawContent.match(/Grund:\s*(.+?)(?:\n|$)/i);
        if (grundMatch) {
            result.reason = grundMatch[1].trim();
            result.reference_id = extractReferenceId(result.reason);
            result.trade_action = extractTradeAction(result.reason) || 'verkauf';

            const itemDescMatch = result.reason.match(/\(([^)]+)\)/);
            if (itemDescMatch) {
                result.category_desc = itemDescMatch[1].trim();
            }

            const action = result.trade_action;
            if (action) {
                result.items.push({
                    name: result.category_desc || result.reason,
                    action,
                    quantity: null
                });
            }
        }

        const zeitMatch = rawContent.match(/(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/);
        if (zeitMatch) result.timestamp = zeitMatch[1];

        return result;
    }

    // ── Einzahlung (Deposit to company account) ──
    // Format: "NAME hat BETRAG$ auf das Konto eingezahlt. Grund: REASON"
    const einzahlungMatch = contentWithoutTitle.match(
        /^([A-Za-zÀ-ÿ\s]+?)\s+hat\s+([\d.,]+)\$?\s+(?:auf\s+(?:das\s+)?Konto\s+eingezahlt|eingezahlt)/i
    );

    if (einzahlungMatch) {
        result.type = 'einzahlung';
        result.employee = einzahlungMatch[1].trim();
        result.amount = parseGermanNumber(einzahlungMatch[2]);

        const grundMatch = rawContent.match(/Grund:\s*(.+?)(?:\n|$)/i);
        if (grundMatch) {
            result.reason = grundMatch[1].trim();
            result.reference_id = extractReferenceId(result.reason);
        }

        const zeitMatch = rawContent.match(/(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/);
        if (zeitMatch) result.timestamp = zeitMatch[1];

        return result;
    }

    // No known format matched → return null to trigger AI fallback
    return null;
}

// ─── Fallback: Gemini AI Parser ──────────────────────────────────────────────

/**
 * Parse a Discord log message using Gemini AI (fallback only)
 */
async function parseWithGeminiAI(rawContent) {
    const ai = getGenAI();
    if (!ai) {
        console.warn('[GeminiParser] No GEMINI_API_KEY set, cannot use AI fallback');
        return null;
    }

    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Du bist ein Parser für FiveM Bossmenü Logs. Analysiere die folgende Nachricht und extrahiere die Daten im JSON-Format.

Die Nachricht kann sein:
1. "Abhebung" - Jemand hebt Geld vom Firmenkonto ab (für Einkäufe)
   Format: "NAME hat BETRAG$ vom Konto abgehoben. Grund: REASON"
2. "Rechnung bezahlt" - Ein Kunde bezahlt eine Rechnung (Verkauf)
   Format: "KUNDE hat eine Rechnung bezahlt. Aussteller: NAME, Betrag: BETRAG$, Grund: REASON"
3. "Einzahlung" - Geld wird auf das Firmenkonto eingezahlt
   Format: "NAME hat BETRAG$ auf das Konto eingezahlt. Grund: REASON"

Extrahiere diese Felder:
- type: "abhebung", "rechnung", oder "einzahlung"
- employee: Name des Mitarbeiters
- customer: Name des Kunden (nur bei Rechnung, sonst null)
- amount: Betrag als Zahl (480.000 → 480000, ohne $ oder Trennzeichen)
- reason: Der vollständige Grund-Text
- reference_id: Der alphanumerische Code (4-8 Zeichen) im Grund, z.B. "AK 3OI1P3 (Farm produkte)" → "3OI1P3". Wenn kein Code erkennbar, null.
- trade_action: "ankauf" oder "verkauf" (basierend auf AK/VK oder Grund)
- category_desc: Beschreibung in Klammern falls vorhanden (z.B. "Farmprodukte")
- ausgestellt_date: Datum aus "Ausgestellt:" (nur bei Rechnung)
- items: Array mit {name, action: "ankauf"|"verkauf", quantity: null}
- timestamp: Falls vorhanden, im ISO-Format

Antworte NUR mit dem JSON-Objekt, ohne Markdown-Formatierung oder Erklärungen.

Nachricht:
${rawContent}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        parsed.parseMethod = 'gemini';
        return parsed;
    } catch (error) {
        console.error('[GeminiParser] AI parsing failed:', error.message);
        return null;
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a Discord log message.
 * Strategy: Regex first (fast, deterministic) → Gemini AI fallback (slow, probabilistic)
 */
export async function parseLogWithAI(rawContent) {
    // 1. Try deterministic regex parsing first
    const regexResult = parseLogWithRegex(rawContent);
    if (regexResult && regexResult.type) {
        console.log(`[Parser] ✓ Regex parsed: ${regexResult.type}, amount=${regexResult.amount}, ref=${regexResult.reference_id}`);
        return regexResult;
    }

    // 2. Fallback to Gemini AI for unrecognized formats
    console.log('[Parser] Regex could not parse, trying Gemini AI fallback...');
    const aiResult = await parseWithGeminiAI(rawContent);
    if (aiResult && aiResult.type) {
        console.log(`[Parser] ✓ Gemini parsed: ${aiResult.type}, amount=${aiResult.amount}, ref=${aiResult.reference_id}`);
        return aiResult;
    }

    // 3. Nothing worked — return a minimal result
    console.warn('[Parser] ✗ Could not parse message with any method');
    return {
        type: null,
        employee: null,
        customer: null,
        amount: null,
        reason: null,
        reference_id: null,
        trade_action: null,
        category_desc: null,
        ausgestellt_date: null,
        items: [],
        timestamp: null,
        parseMethod: 'failed'
    };
}


/**
 * Validate parsed log data
 * @param {Object} parsedLog - The parsed log data
 * @returns {Object} Validation result with isValid and missing fields
 */
export function validateParsedLog(parsedLog) {
    const requiredFields = ['type', 'amount'];
    const missing = requiredFields.filter(field => !parsedLog[field]);

    return {
        isValid: missing.length === 0,
        missing,
        parsedLog
    };
}

export { extractReferenceId, parseGermanNumber };

export default {
    parseLogWithAI,
    parseLogWithRegex,
    validateParsedLog,
    extractReferenceId,
    parseGermanNumber
};
