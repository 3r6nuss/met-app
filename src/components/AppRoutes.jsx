import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import DiscordConfirmationModal from './DiscordConfirmationModal';
import CreateOrderForm from './CreateOrderForm';
import { useAppState } from '../context/AppStateContext';
import { isAdmin, isBuchhaltung, isLager, isHaendler, isFuhrpark, isPending, isSuperAdmin } from '../utils/permissions';
import { api } from '../services/api';

// Pages
import InventoryPage from '../pages/InventoryPage';
import ActionPage from '../pages/ActionPage';
import ControlPage from '../pages/ControlPage';
import SpecialBookingPage from '../pages/SpecialBookingPage';
import ComingSoonPage from '../pages/ComingSoonPage';
import ContactsPage from '../pages/ContactsPage';
import AdsPage from '../pages/AdsPage';
import PartnersPage from '../pages/PartnersPage';
import PersonnelPage from '../pages/PersonnelPage';
import BeginnerGuidePage from '../pages/BeginnerGuidePage';
import AuditLogPage from '../pages/AuditLogPage';
import HausordnungPage from '../pages/HausordnungPage';
import BelegPage from '../pages/BelegPage';
import MarketingPage from '../pages/MarketingPage';
import BookingHub from '../pages/BookingHub';
import ProtocolsHub from '../pages/ProtocolsHub';
import SonstigesHub from '../pages/SonstigesHub';
import FuhrparkPage from '../pages/FuhrparkPage';
import SammelEventPage from '../pages/SammelEventPage';
import SammelEventConfigPage from '../pages/SammelEventConfigPage';
import SystemPage from '../pages/SystemPage';
import PricesPage from '../pages/PricesPage';
import TicketsPage from '../pages/TicketsPage';

// Protocols
import DailyTradeLog from '../pages/protocols/DailyTradeLog';
import WeeklyProtocol from '../pages/protocols/WeeklyProtocol';
import PeriodProtocol from '../pages/protocols/PeriodProtocol';
import StorageProtocol from '../pages/protocols/StorageProtocol';
import InternalStorageProtocol from '../pages/protocols/InternalStorageProtocol';
import AnalyticsProtocol from '../pages/protocols/AnalyticsProtocol';
import CashBookProtocol from '../pages/protocols/CashBookProtocol';
import PayrollProtocol from '../pages/protocols/PayrollProtocol';
import ProfitLossProtocol from '../pages/protocols/ProfitLossProtocol';
import AccountingDashboard from '../pages/protocols/AccountingDashboard';
import BackupProtocol from '../pages/protocols/BackupProtocol';
import PerformanceDashboard from '../pages/protocols/PerformanceDashboard';
import ProductProfitability from '../pages/protocols/ProductProfitability';
import DiscordIntegrationPage from '../pages/protocols/DiscordIntegrationPage';
import TransactionSearchProtocol from '../pages/protocols/TransactionSearchProtocol';

export default function AppRoutes() {
    const {
        // Data
        inventory, transactionLogs, employees, employeeInventory, prices, orders, user,
        // Discord
        pendingDiscordLog, setPendingDiscordLog, recentTransactions,
        // Handlers
        handleCheckIn, handleCheckOut, handleUpdateStock, handleUpdateTarget,
        handleReorder, handleVerify, handleReset, handleUpdateEmployees,
        handleDeleteLog, handleCreateOrder, handleUpdateOrderStatus, handleDeleteOrder,
        handleSpecialBooking, handleConsumeIngredients, handleEmployeePayout,
    } = useAppState();

    const userIsAdmin = isAdmin(user);
    const userIsBuchhaltung = isBuchhaltung(user);
    const userIsLager = isLager(user);
    const userIsHaendler = isHaendler(user);
    const userIsFuhrpark = isFuhrpark(user);
    const userIsPending = isPending(user);
    const userIsSuperAdmin = isSuperAdmin(user);

    const activeEmployees = employees.filter(e => e.status !== 'fired');

    return (
        <>
            <Routes>
                <Route path="/" element={
                    <InventoryPage
                        inventory={inventory}
                        onUpdateStock={handleUpdateStock}
                        onUpdateTarget={handleUpdateTarget}
                        onReorder={handleReorder}
                        onVerify={handleVerify}
                        user={user}
                        orders={orders}
                        onUpdateOrderStatus={handleUpdateOrderStatus}
                        onDeleteOrder={handleDeleteOrder}
                    />
                } />

                {/* ─── Buchung Routes ─────────────────────────────────────── */}
                {(userIsLager || userIsBuchhaltung) && (
                    <Route path="/buchung/einlagern" element={
                        <ActionPage
                            inventory={inventory}
                            employees={activeEmployees}
                            prices={prices}
                            employeeInventory={employeeInventory}
                            onConsumeIngredients={handleConsumeIngredients}
                            onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory, transactionId) => handleCheckIn(id, qty, dep, price, date, 'in', 'internal', warningIgnored, skipInventory, transactionId)}
                            type="in"
                            title="Einlagern"
                            label="Mitarbeiter"
                            showPrice={true}
                            user={user}
                        />
                    } />
                )}

                {(userIsLager || userIsBuchhaltung) && (
                    <Route path="/buchung/auslagern" element={
                        <ActionPage
                            inventory={inventory}
                            employees={activeEmployees}
                            prices={prices}
                            onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory, transactionId) => handleCheckOut(id, qty, dep, price, date, 'out', 'internal', warningIgnored, skipInventory, transactionId)}
                            type="out"
                            title="Auslagern"
                            label="Mitarbeiter"
                            showPrice={userIsBuchhaltung}
                            user={user}
                        />
                    } />
                )}

                {userIsBuchhaltung && (
                    <Route path="/buchung/sonderbuchung" element={
                        <SpecialBookingPage employees={employees} onAction={handleSpecialBooking} />
                    } />
                )}

                {(userIsHaendler || userIsBuchhaltung) && (
                    <Route path="/buchung/auftrag" element={
                        <div className="animate-fade-in">
                            <CreateOrderForm inventory={inventory} onSubmit={handleCreateOrder} />
                        </div>
                    } />
                )}

                {/* ─── Trade Routes ───────────────────────────────────────── */}
                {(userIsHaendler || userIsBuchhaltung) && (
                    <>
                        <Route path="/buchung/einkauf" element={
                            <ActionPage
                                inventory={inventory}
                                employees={employees}
                                prices={prices}
                                onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory, transactionId) => handleCheckIn(id, qty, dep, price, date, 'in', 'trade', warningIgnored, skipInventory, transactionId)}
                                type="in"
                                title="Einkauf (Ankauf)"
                                label="Verkäufer"
                                user={user}
                            />
                        } />
                        <Route path="/buchung/verkauf" element={
                            <ActionPage
                                inventory={inventory}
                                employees={employees}
                                prices={prices}
                                onAction={(id, qty, dep, price, date, type, category, warningIgnored, skipInventory, transactionId) => handleCheckOut(id, qty, dep, price, date, 'out', 'trade', warningIgnored, skipInventory, transactionId)}
                                type="out"
                                title="Verkauf (Abverkauf)"
                                label="Käufer"
                                user={user}
                            />
                        } />
                    </>
                )}

                <Route path="/marketing" element={<MarketingPage prices={prices} inventory={inventory} />} />

                {/* ─── Hub Pages ──────────────────────────────────────────── */}
                {!userIsPending && <Route path="/buchung" element={<BookingHub user={user} />} />}
                {!userIsPending && <Route path="/protokolle" element={<ProtocolsHub user={user} />} />}
                {!userIsPending && <Route path="/sonstiges" element={<SonstigesHub user={user} />} />}
                <Route path="/trade" element={<Navigate to={(userIsHaendler || userIsBuchhaltung) ? "/buchung/einkauf" : "/"} replace />} />

                {/* ─── Protokolle Routes ──────────────────────────────────── */}
                {userIsBuchhaltung && <Route path="/protokolle/trade" element={<DailyTradeLog logs={transactionLogs} />} />}
                {userIsBuchhaltung && <Route path="/protokolle/weekly" element={<WeeklyProtocol logs={transactionLogs} user={user} />} />}
                {!userIsPending && <Route path="/protokolle/internal-storage" element={<InternalStorageProtocol logs={transactionLogs} user={user} employees={employees} onPayout={handleEmployeePayout} />} />}

                {userIsBuchhaltung && (
                    <>
                        <Route path="/protokolle/period" element={<PeriodProtocol logs={transactionLogs} inventory={inventory} employees={employees} />} />
                        <Route path="/protokolle/analytics" element={<AnalyticsProtocol logs={transactionLogs} employees={employees} inventory={inventory} />} />
                        <Route path="/protokolle/kassenbuch" element={<CashBookProtocol logs={transactionLogs} inventory={inventory} prices={prices} onAdjustBalance={handleSpecialBooking} user={user} />} />
                        <Route path="/protokolle/lohn" element={<PayrollProtocol logs={transactionLogs} employees={employees} prices={prices} user={user} />} />
                        <Route path="/protokolle/guv" element={<ProfitLossProtocol logs={transactionLogs} employees={employees} prices={prices} inventory={inventory} />} />
                        <Route path="/protokolle/buchhaltung" element={<AccountingDashboard logs={transactionLogs} employees={employees} inventory={inventory} prices={prices} user={user} />} />
                        <Route path="/protokolle/profitabilitaet" element={<ProductProfitability logs={transactionLogs} prices={prices} inventory={inventory} />} />
                        <Route path="/protokolle/transaktions-suche" element={<TransactionSearchProtocol />} />
                    </>
                )}

                {userIsLager && <Route path="/protokolle/storage" element={<StorageProtocol logs={transactionLogs} />} />}

                {/* Discord Integration - Super Admin Only */}
                {userIsSuperAdmin && (
                    <Route path="/protokolle/discord" element={<DiscordIntegrationPage />} />
                )}

                <Route path="/protokolle/monthly" element={<Navigate to="/protokolle/period" replace />} />

                {userIsBuchhaltung && <Route path="/kontrolle" element={<ControlPage employeeInventory={employeeInventory} employees={employees} inventory={inventory} />} />}

                {/* ─── Sonstiges Routes - Admin ────────────────────────────── */}
                {userIsAdmin && (
                    <>
                        <Route path="/sonstiges/werbung" element={<AdsPage />} />
                        <Route path="/sonstiges/kontakte" element={<ContactsPage />} />
                        <Route path="/sonstiges/partner" element={<PartnersPage />} />
                        <Route path="/sonstiges/personal" element={<PersonnelPage />} />
                        <Route path="/beleg" element={<BelegPage prices={prices} />} />
                        <Route path="/preise" element={<PricesPage />} />
                    </>
                )}

                {/* ─── Sonstiges Routes - Public ──────────────────────────── */}
                {!userIsPending && (
                    <>
                        <Route path="/sonstiges/hausordnung" element={<HausordnungPage user={user} />} />
                        <Route path="/sonstiges/beginner-guide" element={<BeginnerGuidePage user={user} />} />
                    </>
                )}

                {/* ─── Sammel-Event Routes ────────────────────────────────── */}
                {!userIsPending && (
                    <>
                        <Route path="/sammel-event" element={<SammelEventPage employees={employees} />} />
                        {userIsBuchhaltung && (
                            <Route path="/sammel-event/config" element={<SammelEventConfigPage employees={employees} inventory={inventory} />} />
                        )}
                    </>
                )}

                {/* ─── Fuhrpark ───────────────────────────────────────────── */}
                {userIsFuhrpark && (
                    <Route path="/sonstiges/fuhrpark" element={<FuhrparkPage user={user} />} />
                )}

                {/* ─── System Routes ──────────────────────────────────────── */}
                {userIsBuchhaltung && (
                    <>
                        <Route path="/system" element={
                            <ErrorBoundary>
                                <SystemPage employees={employees} onUpdateEmployees={handleUpdateEmployees} logs={transactionLogs} onDeleteLog={handleDeleteLog} onReset={handleReset} user={user} inventory={inventory} />
                            </ErrorBoundary>
                        } />
                        <Route path="/system/employees" element={
                            <ErrorBoundary>
                                <SystemPage employees={employees} onUpdateEmployees={handleUpdateEmployees} logs={transactionLogs} onDeleteLog={handleDeleteLog} onReset={handleReset} user={user} inventory={inventory} />
                            </ErrorBoundary>
                        } />
                        <Route path="/tickets" element={<ErrorBoundary><TicketsPage /></ErrorBoundary>} />
                        <Route path="/tickets/:id" element={<ErrorBoundary><TicketsPage /></ErrorBoundary>} />
                    </>
                )}

                {/* ─── Super Admin Routes ─────────────────────────────────── */}
                {userIsSuperAdmin && (
                    <>
                        <Route path="/aktivitaetslog" element={<AuditLogPage />} />
                        <Route path="/admin/backup" element={<BackupProtocol user={user} />} />
                        <Route path="/admin/performance" element={<PerformanceDashboard user={user} />} />
                    </>
                )}
            </Routes>

            {/* ─── Discord Confirmation Modal ─────────────────────────────── */}
            {pendingDiscordLog && (
                <DiscordConfirmationModal
                    discordLog={pendingDiscordLog}
                    recentTransactions={recentTransactions}
                    onConfirm={async (discordLogId, transaction) => {
                        try {
                            await api.confirmDiscordLog(discordLogId, transaction.timestamp);
                            console.log('[Discord] Confirmation saved');
                            setPendingDiscordLog(null);
                        } catch (err) {
                            console.error('[Discord] Confirmation failed:', err);
                        }
                    }}
                    onDismiss={() => setPendingDiscordLog(null)}
                    onNotMine={async () => {
                        try {
                            await api.dismissDiscordLog(pendingDiscordLog.id);
                            setPendingDiscordLog(null);
                        } catch (err) {
                            console.error('[Discord] Dismiss failed:', err);
                        }
                    }}
                />
            )}
        </>
    );
}
