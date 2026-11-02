import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  User,
  Clock,
  Layers,
  ArrowRight,
  Eye,
  X,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { AuditLog } from '../../types/erp';
import { printElementContent } from '../../utils/printEngine';

export const AuditLogViewer: React.FC = () => {
  const { auditLogs, currentCompany, currentUser, users } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filter logs for current company (or user scope)
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTerm =
          log.action.toLowerCase().includes(term) ||
          log.module.toLowerCase().includes(term) ||
          log.details.toLowerCase().includes(term) ||
          log.userName.toLowerCase().includes(term) ||
          (log.entityId && log.entityId.toLowerCase().includes(term)) ||
          (log.oldValue && log.oldValue.toLowerCase().includes(term)) ||
          (log.newValue && log.newValue.toLowerCase().includes(term));

        if (!matchesTerm) return false;
      }

      // Module filter
      if (moduleFilter !== 'all') {
        if (moduleFilter === 'vouchers' && !['Vouchers', 'voucher'].includes(log.module)) return false;
        if (moduleFilter === 'inventory' && !['Inventory', 'product'].includes(log.module)) return false;
        if (moduleFilter === 'sales' && !['Sales', 'sale'].includes(log.module)) return false;
        if (moduleFilter === 'security' && !['Auth', 'Security', 'security'].includes(log.module)) return false;
        if (moduleFilter === 'settings' && !['Settings', 'Company', 'Users'].includes(log.module)) return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && log.severity !== severityFilter) {
        return false;
      }

      // User filter
      if (userFilter !== 'all' && log.userId !== userFilter) {
        return false;
      }

      return true;
    });
  }, [auditLogs, searchTerm, moduleFilter, severityFilter, userFilter]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = auditLogs.length;
    const criticalCount = auditLogs.filter((l) => l.severity === 'critical').length;
    const voucherUpdates = auditLogs.filter(
      (l) => l.action.includes('VOUCHER') || l.module === 'Vouchers'
    ).length;
    const inventoryUpdates = auditLogs.filter(
      (l) => l.module === 'Inventory' || l.action.includes('STOCK') || l.action.includes('PRODUCT')
    ).length;
    const salesDeletions = auditLogs.filter(
      (l) => l.action.includes('DELETE_SALE') || l.action.includes('VOID') || (l.module === 'Sales' && l.severity === 'critical')
    ).length;

    return { total, criticalCount, voucherUpdates, inventoryUpdates, salesDeletions };
  }, [auditLogs]);

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Severity', 'Entity ID', 'Details', 'Old Value', 'New Value', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.userRole || ''}"`,
      `"${l.action}"`,
      `"${l.module}"`,
      `"${l.severity || 'info'}"`,
      `"${l.entityId || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || '192.168.1.100'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ApexERP_Audit_Trail_${currentCompany.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    printElementContent('audit-log-table-area', 'Audit Trail & Compliance Log', currentCompany.name);
  };

  const getActionBadgeColor = (action: string, severity?: string) => {
    if (severity === 'critical' || action.includes('DELETE') || action.includes('DENIED') || action.includes('VIOLATION')) {
      return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800';
    }
    if (severity === 'warning' || action.includes('REVERSE') || action.includes('ADJUSTMENT') || action.includes('VOID')) {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('LOGIN_SUCCESS')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (action.includes('UPDATE') || action.includes('TRANSFER')) {
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Enterprise Audit Log Viewer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {currentCompany.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tamper-evident trail tracking all voucher changes, inventory adjustments, sales deletions & user actions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={printReport}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Audit Log</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 font-medium">Total Audit Records</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.total}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Recorded events</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10">
          <p className="text-[11px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
            <Trash2 className="w-3 h-3" />
            Sales Deletions / Voids
          </p>
          <p className="text-xl font-black text-red-700 dark:text-red-400 mt-1 font-mono">
            {metrics.salesDeletions}
          </p>
          <p className="text-[10px] text-red-500/80 mt-0.5">Voided invoices logged</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Voucher Changes
          </p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1 font-mono">
            {metrics.voucherUpdates}
          </p>
          <p className="text-[10px] text-amber-600/80 mt-0.5">Reversals & modifications</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
          <p className="text-[11px] text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Inventory Updates
          </p>
          <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1 font-mono">
            {metrics.inventoryUpdates}
          </p>
          <p className="text-[10px] text-blue-600/80 mt-0.5">Stock adjustments & transfers</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            Critical Severity Events
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.criticalCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Requires audit attention</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, details, user, invoice # or voucher #..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Module Filter */}
          <div className="md:col-span-3">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">All Modules</option>
              <option value="vouchers">Vouchers (Reversals & Edits)</option>
              <option value="inventory">Inventory & Products</option>
              <option value="sales">Sales (Invoices & Deletions)</option>
              <option value="security">Security & Auth</option>
              <option value="settings">Settings & RBAC</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="md:col-span-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
              <option value="info">Info Only</option>
            </select>
          </div>

          {/* User Filter */}
          <div className="md:col-span-2">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">All Staff Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Tags */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Quick Presets:
          </span>
          <button
            onClick={() => {
              setModuleFilter('all');
              setSeverityFilter('all');
              setSearchTerm('');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              moduleFilter === 'all' && severityFilter === 'all' && !searchTerm
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => {
              setModuleFilter('sales');
              setSearchTerm('DELETE');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              searchTerm === 'DELETE'
                ? 'bg-red-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Deleted Sales Invoices
          </button>
          <button
            onClick={() => {
              setModuleFilter('vouchers');
              setSearchTerm('REVERSE');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              searchTerm === 'REVERSE'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Voucher Reversals
          </button>
          <button
            onClick={() => {
              setModuleFilter('inventory');
              setSearchTerm('ADJUSTMENT');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              searchTerm === 'ADJUSTMENT'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Stock Adjustments
          </button>
          <button
            onClick={() => {
              setSeverityFilter('critical');
              setSearchTerm('');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              severityFilter === 'critical'
                ? 'bg-red-700 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Security Violations & Denials
          </button>
        </div>
      </div>

      {/* Main Audit Trail Data Table */}
      <div id="audit-log-table-area" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Audit Event Log Stream
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              Showing {filteredLogs.length} of {auditLogs.length} records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Details & Reason</th>
                <th className="py-3 px-4 text-center">Severity</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">No audit events match your current filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                          {log.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                            {log.userName}
                          </p>
                          <p className="text-[10px] text-slate-400">{log.userRole || 'Staff'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono inline-block ${getActionBadgeColor(
                          log.action,
                          log.severity
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {log.module}
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      <p className="text-slate-700 dark:text-slate-300 truncate font-medium">
                        {log.details}
                      </p>
                      {log.entityId && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Ref ID: {log.entityId}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          log.severity === 'critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : log.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {log.severity === 'critical' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {log.severity || 'info'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="px-2 py-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail & Diff Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${getActionBadgeColor(
                    selectedLog.action,
                    selectedLog.severity
                  )}`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Audit Event Details & Data Snapshot
                  </h3>
                  <p className="text-xs text-slate-500">Record ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Event Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Timestamp</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{selectedLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Operator</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLog.userName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Module</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedLog.module}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Severity</span>
                  <span className="font-bold uppercase text-rose-600 dark:text-rose-400">{selectedLog.severity || 'info'}</span>
                </div>
              </div>

              {/* Event Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Full Description & Event Context
                </label>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {selectedLog.details}
                </div>
              </div>

              {/* Old vs New State Diff (Crucial for vouchers, inventory updates, and sales deletions) */}
              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                    State Comparison (Before vs After Mutation)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                        Prior State (Before)
                      </span>
                      <pre className="font-mono text-[11px] text-red-900 dark:text-red-200 whitespace-pre-wrap break-all">
                        {selectedLog.oldValue || '(No prior state recorded)'}
                      </pre>
                    </div>

                    <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Resulting State (After)
                      </span>
                      <pre className="font-mono text-[11px] text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap break-all">
                        {selectedLog.newValue || '(Entity deleted / voided)'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw JSON Meta */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Raw Audit Log Payload
                </label>
                <pre className="p-3 bg-slate-900 text-slate-300 rounded-lg text-[10px] font-mono overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-bold text-slate-800 dark:text-white"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
