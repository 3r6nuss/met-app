/**
 * Generate a random 6-character alphanumeric transaction ID.
 * Shared between CheckInForm and CheckOutForm.
 */
export const generateTransactionId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};
