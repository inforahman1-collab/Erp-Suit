import React, { useState } from 'react';
import {
  Users2,
  ShieldCheck,
  Building2,
  Lock,
  Edit2,
  Check,
  AlertCircle,
  Plus,
  KeyRound,
  X,
  Layers,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { User, UserRole } from '../../types/erp';

const ALL_MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'flowchart', name: 'Flow Chart (Bank & Cash Funds)' },
  { id: 'vouchers', name: 'Double-Entry Vouchers' },
  { id: 'inventory', name: 'Inventory & Stock' },
  { id: 'sales', name: 'Sales & POS Invoicing' },
  { id: 'purchases', name: 'Purchases & Bills' },
  { id: 'customers', name: 'Customers Ledger' },
  { id: 'suppliers', name: 'Suppliers Ledger' },
  { id: 'accounting', name: 'General Accounting' },
  { id: 'budgets', name: 'Budgets & Financial Targets' },
  { id: 'reports', name: 'Financial & Audit Reports' },
  { id: 'analytics', name: 'Analytics & Forecasts' },
  { id: 'settings', name: 'Settings & Security' },
];

export const UserAccessManagement: React.FC = () => {
  const { users, companies, currentUser, updateUserPermissions, addUser } = useERP();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('Accountant');
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New User Modal
  const [isOpenAddUser, setIsOpenAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('user123');
  const [newRole, setNewRole] = useState<UserRole>('Accountant');
  const [newCompanyIds, setNewCompanyIds] = useState<string[]>([companies[0]?.id || 'comp_apex']);

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setSelectedCompanyIds(user.allowedCompanyIds || [companies[0]?.id]);
    setSelectedBranchIds(user.allowedBranchIds || []);
    setSelectedModules(
      user.allowedModules || [
        'dashboard',
        'vouchers',
        'inventory',
        'sales',
        'purchases',
        'customers',
        'suppliers',
        'accounting',
        'reports',
        'analytics',
      ]
    );
    setUserRole(user.role);
    setUserPassword(user.password || 'admin123');
  };

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      if (prev.includes(companyId)) {
        // Prevent deselecting all companies
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules((prev) => {
      if (prev.includes(moduleId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUserPermissions(editingUser.id, {
      role: userRole,
      password: userPassword,
      allowedCompanyIds: selectedCompanyIds,
      allowedBranchIds: selectedBranchIds,
      allowedModules: selectedModules,
    });

    setSaveSuccess(true);
    setEditingUser(null);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    addUser({
      name: newName,
      email: newEmail,
      phone: newPhone,
      password: newPassword,
      role: newRole,
      allowedCompanyIds: newCompanyIds,
      allowedModules: [
        'dashboard',
        'vouchers',
        'inventory',
        'sales',
        'purchases',
        'customers',
        'suppliers',
        'reports',
      ],
      status: 'active',
    });

    setIsOpenAddUser(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('user123');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            User Access Matrix & Multi-Company Authorization Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define specific company isolation rules, branch scopes, module permissions, and passwords for each user.
          </p>
        </div>

        <button
          onClick={() => setIsOpenAddUser(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New User</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>User authorization permissions, company access list, and credentials updated successfully!</span>
        </div>
      )}

      {/* Access Enforcement Banner */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-start gap-3">
        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-bold">Strict Multi-Tenant Isolation Enforced:</p>
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            Users cannot view, access, or switch to companies that are not explicitly assigned to them. When an operator signs in, the software automatically restricts their company dropdown and financial vouchers exclusively to their permitted companies.
          </p>
        </div>
      </div>

      {/* Users & Access Rules Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Authorized Companies</th>
                <th className="py-3 px-4">Module Permissions</th>
                <th className="py-3 px-4 text-center">Password</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const isSuper = u.role === 'Super Administrator';
                const permittedComps = companies.filter(
                  (c) => isSuper || (u.allowedCompanyIds && u.allowedCompanyIds.includes(c.id))
                );

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.id === currentUser.id && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {isSuper ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            All Companies ({companies.length})
                          </span>
                        ) : (
                          permittedComps.map((comp) => (
                            <span
                              key={comp.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            >
                              {comp.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[11px] text-slate-500 max-w-xs truncate">
                        {isSuper ? 'Full System Access' : `${u.allowedModules?.length || 8} Modules Allowed`}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                        ••••••••
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Access</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Configure Access & Permissions: {editingUser.name}
                  </h3>
                  <p className="text-xs text-slate-400">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4 text-xs">
              {/* Role & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    User Role
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Super Administrator">Super Administrator</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Branch Manager">Branch Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Login Password</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-rose-500 font-normal hover:underline"
                    >
                      {showPassword ? 'Hide' : 'Reveal'}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Company Access Authorization (CRITICAL REQUIREMENT) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-rose-600" />
                    Authorized Company Access (Tenant Isolation)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Checked = Allowed to switch & view data
                  </span>
                </div>

                <div className="space-y-2">
                  {companies.map((comp) => {
                    const isChecked = selectedCompanyIds.includes(comp.id);
                    return (
                      <label
                        key={comp.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCompany(comp.id)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{comp.name}</p>
                            <p className="text-[10px] text-slate-400">{comp.address} • Branches: {comp.branches.length}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold">
                          {comp.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Module Access Authorization */}
              <div className="space-y-2 pt-2">
                <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Module & Feature Permissions
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_MODULES.map((mod) => {
                    const isAllowed = selectedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                          isAllowed
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => handleToggleModule(mod.id)}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-[11px] truncate">{mod.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Access Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isOpenAddUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              Register New System User
            </h3>

            <form onSubmit={handleCreateNewUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Asif Mahmud"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. asif@apextrading.bd"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Default password"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="Accountant">Accountant</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Super Administrator">Super Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenAddUser(false)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
