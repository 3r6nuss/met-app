/**
 * Role & permission helpers for the MET Dashboard.
 * Single source of truth for role checks and super-admin IDs.
 */

export const SUPER_ADMIN_IDS = ['823276402320998450', '690510884639866960'];

export const isAdmin = (user) => user?.role === 'Administrator';

export const isBuchhaltung = (user) => user?.role === 'Buchhaltung' || isAdmin(user);

export const isLagerleitung = (user) => user?.role === 'Lagerleitung' || isBuchhaltung(user);

export const isLager = (user) =>
    (user?.isLagerist === 1 || user?.isLagerist === true) ||
    user?.role === 'Lager' ||
    isLagerleitung(user);

export const isHaendler = (user) =>
    (user?.isHaendler === 1 || user?.isHaendler === true) ||
    user?.role === 'Händler' ||
    isBuchhaltung(user);

export const isFuhrpark = (user) => user?.role === 'Fuhrparkmanager' || isAdmin(user);

export const isPending = (user) => user?.role === 'Pending';

export const isSuperAdmin = (user) => SUPER_ADMIN_IDS.includes(user?.discordId);
