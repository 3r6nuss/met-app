/**
 * Gemini AI Parser for FiveM Discord Logs
 * Parses log messages to extract structured data (Abhebung/Rechnung)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Parse a Discord log message using Gemini AI
 * @param {string} rawContent - The raw Discord message content
 * @returns {Promise<Object>} Structured log data
 */
export async function parseLogWithAI(rawContent) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Du bist ein Parser für FiveM Bossmenü Logs. Analysiere die folgende Nachricht und extrahiere die Daten im JSON-Format.

Die Nachricht kann sein:
1. "Abhebung" - Jemand hebt Geld vom Firmenkonto ab (für Einkäufe)
2. "Rechnung bezahlt" - Ein Kunde bezahlt eine Rechnung (Verkauf)

Extrahiere diese Felder:
- type: "abhebung" oder "rechnung"
- employee: Name des Mitarbeiters (der abhebt oder die Rechnung ausstellt)
- customer: Name des Kunden (nur bei Rechnung, sonst null)
- amount: Betrag in Dollar (nur die Zahl, ohne $ oder Punkte)
- reason: Grund für die Transaktion
- reference_id: Falls im Grund eine Referenz-ID steht (z.B. "Ankauf 8HZV36" → "8HZV36"), extrahiere diese. Ein kurzer alphanumerischer Code (4-8 Zeichen) am Ende des Grundes. Wenn keine ID erkennbar, dann null.
- items: Array mit extrahierten Produkten, jedes mit {name, action: "ankauf"|"verkauf", quantity: number|null}
- timestamp: Zeitstempel falls in der Nachricht vorhanden (ISO-Format)

Antworte NUR mit dem JSON-Objekt, ohne Markdown-Formatierung.

Nachricht:
${rawContent}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        try {
            // Remove any markdown code blocks if present
            const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('[GeminiParser] Failed to parse AI response as JSON:', text);
            // Fallback to regex parsing
            return parseLogWithRegex(rawContent);
        }
    } catch (error) {
        console.error('[GeminiParser] AI parsing failed, using regex fallback:', error.message);
        return parseLogWithRegex(rawContent);
    }
}

/**
 * Fallback regex parser for when AI is unavailable
 * @param {string} rawContent - The raw Discord message content
 * @returns {Object} Structured log data
 */
export function parseLogWithRegex(rawContent) {
    const result = {
        type: null,
        employee: null,
        customer: null,
        amount: null,
        reason: null,
        reference_id: null,
        items: [],
        timestamp: null,
        parseMethod: 'regex'
    };

    // Detect type
    if (rawContent.toLowerCase().includes('abhebung')) {
        result.type = 'abhebung';

        // Pattern: "NAME hat AMOUNT$ vom Konto abgehoben. Grund: REASON"
        const abhebungMatch = rawContent.match(/(.+?)\s+hat\s+([\d.]+)\$?\s+vom Konto abgehoben/i);
        if (abhebungMatch) {
            result.employee = abhebungMatch[1].trim();
            result.amount = parseFloat(abhebungMatch[2].replace(/\./g, ''));
        }

        const grundMatch = rawContent.match(/Grund:\s*(.+?)(?:\n|$)/i);
        if (grundMatch) {
            result.reason = grundMatch[1].trim();
            // Try to extract reference ID from reason (e.g. "Ankauf 8HZV36" → "8HZV36")
            const refIdMatch = result.reason.match(/\b([A-Z0-9]{4,8})$/i);
            if (refIdMatch) {
                result.reference_id = refIdMatch[1].toUpperCase();
            }
            // Try to extract items from reason
            const ankaufMatch = result.reason.match(/ankauf\s+(.+)/i);
            if (ankaufMatch) {
                result.items.push({
                    name: ankaufMatch[1].trim(),
                    action: 'ankauf',
                    quantity: null
                });
            }
        }
    } else if (rawContent.toLowerCase().includes('rechnung bezahlt') || rawContent.toLowerCase().includes('rechnung')) {
        result.type = 'rechnung';

        // Pattern: "CUSTOMER hat eine Rechnung bezahlt: Aussteller: EMPLOYEE"
        const customerMatch = rawContent.match(/(.+?)\s+hat eine Rechnung bezahlt/i);
        if (customerMatch) {
            result.customer = customerMatch[1].trim();
        }

        const ausstellerMatch = rawContent.match(/Aussteller:\s*(.+?)(?:\n|,|$)/i);
        if (ausstellerMatch) {
            result.employee = ausstellerMatch[1].trim();
        }

        const betragMatch = rawContent.match(/Betrag:\s*([\d.]+)\$?/i);
        if (betragMatch) {
            result.amount = parseFloat(betragMatch[1].replace(/\./g, ''));
        }

        const grundMatch = rawContent.match(/Grund:\s*(.+?)(?:\n|$)/i);
        if (grundMatch) {
            result.reason = grundMatch[1].trim();
            // Try to extract reference ID from reason
            const refIdMatch = result.reason.match(/\b([A-Z0-9]{4,8})$/i);
            if (refIdMatch) {
                result.reference_id = refIdMatch[1].toUpperCase();
            }
            // Try to extract items from reason
            const verkaufMatch = result.reason.match(/verkauf\s+(.+)/i);
            if (verkaufMatch) {
                result.items.push({
                    name: verkaufMatch[1].trim(),
                    action: 'verkauf',
                    quantity: null
                });
            }
        }
    }

    // Try to extract timestamp
    const zeitMatch = rawContent.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if (zeitMatch) {
        result.timestamp = zeitMatch[1];
    }

    return result;
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

export default {
    parseLogWithAI,
    parseLogWithRegex,
    validateParsedLog
};
