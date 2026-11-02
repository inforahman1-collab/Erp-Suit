/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { TopNavbar } from './components/layout/TopNavbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { VoucherHub } from './components/vouchers/VoucherHub';
import { InventoryView } from './components/inventory/InventoryView';
import { SalesView } from './components/sales/SalesView';
import { PurchaseView } from './components/purchases/PurchaseView';
import { PartyLedgerView } from './components/ledgers/PartyLedgerView';
import { AccountingView } from './components/accounting/AccountingView';
import { ReportsView } from './components/reports/ReportsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AndroidSimulatorView } from './components/mobile/AndroidSimulatorView';
import { SettingsView } from './components/settings/SettingsView';
import { BudgetsView } from './components/budget/BudgetsView';
import { FundsFlowChartView } from './components/funds/FundsFlowChartView';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { DownloadCenterModal } from './components/common/DownloadCenterModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterCompanyModal } from './components/company/RegisterCompanyModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const ERPAppContent: React.FC = () => {
  const { activeTab, setActiveTab, appMode, theme, isAuthenticated } = useERP();

  // Modals controlled globally
  const [isOpenShortcuts, setIsOpenShortcuts] = useState(false);
  const [isOpenDownloadCenter, setIsOpenDownloadCenter] = useState(false);
  const [isOpenRegisterCompany, setIsOpenRegisterCompany] = useState(false);
  const [isOpenSaleModal, setIsOpenSaleModal] = useState(false);
  const [isOpenVoucherModal, setIsOpenVoucherModal] = useState(false);
  const [isOpenPurchaseModal, setIsOpenPurchaseModal] = useState(false);

  // If user has not authenticated with password yet, require password login
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Keyboard shortcut listener for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsOpenShortcuts((prev) => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('sales');
        setIsOpenSaleModal(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('vouchers');
        setIsOpenVoucherModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('inventory');
      } else if (e.key === 'Escape') {
        setIsOpenShortcuts(false);
        setIsOpenDownloadCenter(false);
        setIsOpenSaleModal(false);
        setIsOpenVoucherModal(false);
        setIsOpenPurchaseModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Universal Top Bar */}
      <TopNavbar
        onOpenShortcuts={() => setIsOpenShortcuts(true)}
        onOpenDownloadCenter={() => setIsOpenDownloadCenter(true)}
        onOpenRegisterCompany={() => setIsOpenRegisterCompany(true)}
      />

      {/* Main Workspace Frame */}
      {appMode === 'android' ? (
        <main className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          <AndroidSimulatorView
            onOpenSaleModal={() => {
              setActiveTab('sales');
              setIsOpenSaleModal(true);
            }}
            onOpenVoucherModal={() => {
              setActiveTab('vouchers');
              setIsOpenVoucherModal(true);
            }}
          />
        </main>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Sidebar Navigation */}
          <Sidebar
            onOpenDownloadCenter={() => setIsOpenDownloadCenter(true)}
          />

          {/* Module Content Viewport */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && (
                <DashboardView
                  onOpenSaleModal={() => setIsOpenSaleModal(true)}
                  onOpenVoucherModal={() => setIsOpenVoucherModal(true)}
                  onOpenPurchaseModal={() => setIsOpenPurchaseModal(true)}
                />
              )}

              {activeTab === 'flowchart' && <FundsFlowChartView />}

              {activeTab === 'vouchers' && (
                <VoucherHub
                  isOpenCreateModal={isOpenVoucherModal}
                  onCloseCreateModal={() => setIsOpenVoucherModal(false)}
                  onOpenCreateModal={() => setIsOpenVoucherModal(true)}
                />
              )}

              {activeTab === 'inventory' && <InventoryView />}

              {activeTab === 'sales' && (
                <SalesView
                  isOpenNewSaleModal={isOpenSaleModal}
                  onCloseNewSaleModal={() => setIsOpenSaleModal(false)}
                  onOpenNewSaleModal={() => setIsOpenSaleModal(true)}
                />
              )}

              {activeTab === 'purchases' && (
                <PurchaseView
                  isOpenNewPurchaseModal={isOpenPurchaseModal}
                  onCloseNewPurchaseModal={() => setIsOpenPurchaseModal(false)}
                  onOpenNewPurchaseModal={() => setIsOpenPurchaseModal(true)}
                />
              )}

              {activeTab === 'customers' && <PartyLedgerView initialType="customers" />}

              {activeTab === 'suppliers' && <PartyLedgerView initialType="suppliers" />}

              {activeTab === 'accounting' && <AccountingView />}

              {activeTab === 'budgets' && <BudgetsView />}

              {activeTab === 'reports' && <ReportsView />}

              {activeTab === 'analytics' && <AnalyticsView />}

              {activeTab === 'settings' && <SettingsView />}
            </div>
          </main>
        </div>
      )}

      {/* Global Keyboard Shortcuts Modal */}
      <ShortcutsModal isOpen={isOpenShortcuts} onClose={() => setIsOpenShortcuts(false)} />

      {/* Global Download Center Modal (SQL Dumps, JSON Backups, Spreadsheets, App Packages) */}
      <DownloadCenterModal
        isOpen={isOpenDownloadCenter}
        onClose={() => setIsOpenDownloadCenter(false)}
      />

      {/* Global Register New Company Modal */}
      <RegisterCompanyModal
        isOpen={isOpenRegisterCompany}
        onClose={() => setIsOpenRegisterCompany(false)}
      />

      {/* Non-intrusive Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Apex ERP Workspace">
      <ERPProvider>
        <ErrorBoundary fallbackTitle="Apex ERP Interface View">
          <ERPAppContent />
        </ErrorBoundary>
      </ERPProvider>
    </ErrorBoundary>
  );
}
