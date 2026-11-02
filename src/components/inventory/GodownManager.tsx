import React, { useState, useMemo } from 'react';
import {
  Warehouse,
  GitBranch,
  Plus,
  Search,
  MapPin,
  Phone,
  UserCheck,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Building2,
  Boxes,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Godown } from '../../types/erp';

export const GodownManager: React.FC = () => {
  const { godowns, addGodown, updateGodown, deleteGodown, currentBranchId, branches } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formNameBn, setFormNameBn] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formParentId, setFormParentId] = useState<string>(''); // empty string for Main Godown, or parentId for Sub-Godown
  const [formLocation, setFormLocation] = useState('');
  const [formCapacity, setFormCapacity] = useState('10,000 MT / 50,000 Sqft');
  const [formManager, setFormManager] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBranchId, setFormBranchId] = useState(branches[0]?.id || '');
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('Godown decommissioned');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Main Godowns (Root level, parentId is null or empty)
  const mainGodowns = useMemo(() => {
    return godowns.filter((g) => !g.parentId);
  }, [godowns]);

  // Sub Godowns map: parentId -> Godown[]
  const subGodownsByParent = useMemo(() => {
    const map: Record<string, Godown[]> = {};
    godowns.forEach((g) => {
      if (g.parentId) {
        if (!map[g.parentId]) map[g.parentId] = [];
        map[g.parentId].push(g);
      }
    });
    return map;
  }, [godowns]);

  // Open Create Main Godown Modal
  const handleOpenCreateMain = () => {
    setEditingGodown(null);
    setFormName('');
    setFormNameBn('');
    setFormCode(`GDN-${String(godowns.length + 1).padStart(2, '0')}`);
    setFormParentId('');
    setFormLocation('Central Industrial Area, Dhaka');
    setFormCapacity('10,000 MT / 50,000 Sqft');
    setFormManager('');
    setFormPhone('');
    setFormBranchId(currentBranchId !== 'all' ? currentBranchId : branches[0]?.id || '');
    setFormError(null);
    setIsOpenModal(true);
  };

  // Open Create Sub-Godown Modal (optionally preselecting a parent)
  const handleOpenCreateSub = (parentId?: string) => {
    setEditingGodown(null);
    setFormName('');
    setFormNameBn('');
    setFormCode(`SUB-GDN-${String(godowns.length + 1).padStart(2, '0')}`);
    setFormParentId(parentId || (mainGodowns[0]?.id ?? ''));
    setFormLocation('Shed 1, Storage Block');
    setFormCapacity('5,000 Units');
    setFormManager('');
    setFormPhone('');
    setFormBranchId(currentBranchId !== 'all' ? currentBranchId : branches[0]?.id || '');
    setFormError(null);
    setIsOpenModal(true);
  };

  // Open Edit Godown Modal
  const handleOpenEdit = (g: Godown) => {
    setEditingGodown(g);
    setFormName(g.name);
    setFormNameBn(g.nameBn || '');
    setFormCode(g.code);
    setFormParentId(g.parentId || '');
    setFormLocation(g.location);
    setFormCapacity(g.capacity || '10,000 MT');
    setFormManager(g.manager || '');
    setFormPhone(g.phone || '');
    setFormBranchId(g.branchId);
    setFormError(null);
    setIsOpenModal(true);
  };

  const handleSaveGodown = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Godown name is required.');
      return;
    }

    if (editingGodown) {
      const res = updateGodown(editingGodown.id, {
        name: formName.trim(),
        nameBn: formNameBn.trim() || undefined,
        code: formCode.trim(),
        parentId: formParentId || null,
        location: formLocation.trim(),
        capacity: formCapacity.trim(),
        manager: formManager.trim() || undefined,
        phone: formPhone.trim() || undefined,
        branchId: formBranchId,
      });

      if (res.success) {
        setIsOpenModal(false);
      } else {
        setFormError(res.error || 'Failed to update godown');
      }
    } else {
      const res = addGodown({
        name: formName.trim(),
        nameBn: formNameBn.trim() || undefined,
        code: formCode.trim(),
        parentId: formParentId || null,
        location: formLocation.trim(),
        capacity: formCapacity.trim(),
        manager: formManager.trim() || undefined,
        phone: formPhone.trim() || undefined,
        branchId: formBranchId,
        isActive: true,
      });

      if (res.success) {
        setIsOpenModal(false);
      } else {
        setFormError(res.error || 'Failed to create godown');
      }
    }
  };

  const handleDeleteGodown = () => {
    if (!deletingId) return;
    setDeleteError(null);

    const res = deleteGodown(deletingId, deleteReason);
    if (res.success) {
      setDeletingId(null);
    } else {
      setDeleteError(res.error || 'Failed to delete godown');
    }
  };

  // Filtered Main Godowns
  const filteredMainGodowns = useMemo(() => {
    if (!searchQuery.trim()) return mainGodowns;
    const q = searchQuery.toLowerCase();
    return mainGodowns.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        (m.nameBn && m.nameBn.includes(q))
    );
  }, [mainGodowns, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Top Banner and Action Buttons */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Multi-Tier Godown & Sub-Godown Architecture (গুদাম ও সাব-গুদাম ব্যবস্থাপনা)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create central warehouses (Main Godowns) and organize localized sub-godowns under them with stock tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateMain}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Godown (প্রধান গুদাম)</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateSub()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            <span>Create Sub-Godown (সাব-গুদাম)</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-600 text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase">Main Godowns (প্রধান গুদাম)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{mainGodowns.length}</p>
          </div>
        </div>

        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-600 text-white">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Sub-Godowns (সাব-গুদাম)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {godowns.filter((g) => g.parentId).length}
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/40 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-600 text-white">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase">Total Active Storage Nodes</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{godowns.length}</p>
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Godowns & Sub-Godowns by name, code, or location..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
        />
      </div>

      {/* Hierarchical Godown Tree Cards */}
      <div className="space-y-4">
        {filteredMainGodowns.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
            No Godowns found. Click "Create Godown" to create your first central warehouse.
          </div>
        ) : (
          filteredMainGodowns.map((main) => {
            const children = subGodownsByParent[main.id] || [];

            return (
              <div
                key={main.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
              >
                {/* Main Godown Header Card */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 shrink-0 mt-0.5">
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{main.name}</span>
                        {main.nameBn && (
                          <span className="text-xs text-slate-500 font-medium">({main.nameBn})</span>
                        )}
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-mono font-bold rounded">
                          {main.code}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold rounded uppercase">
                          Main Godown (প্রধান গুদাম)
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {main.location}
                        </span>
                        {main.manager && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            {main.manager}
                          </span>
                        )}
                        {main.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {main.phone}
                          </span>
                        )}
                        {main.capacity && (
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            Capacity: {main.capacity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on Main Godown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateSub(main.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                      title="Create Sub-Godown under this Godown"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Sub-Godown (সাব-গুদাম)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(main)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Edit Godown"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingId(main.id);
                        setDeleteError(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Godown"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Nested Sub-Godowns Under This Main Godown */}
                <div className="p-3 bg-white dark:bg-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-2 py-1 font-semibold uppercase">
                    <span className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" />
                      Sub-Godowns under this facility ({children.length})
                    </span>
                    {children.length === 0 && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        No sub-godowns created yet. Click "+ Sub-Godown" above to partition storage.
                      </span>
                    )}
                  </div>

                  {children.length > 0 && (
                    <div className="space-y-1.5 pl-4 border-l-2 border-amber-300 dark:border-amber-700/60 ml-3">
                      {children.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-amber-400 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600 font-bold font-mono">↳</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{sub.name}</span>
                                {sub.nameBn && (
                                  <span className="text-slate-400 font-medium">({sub.nameBn})</span>
                                )}
                                <span className="font-mono text-[10px] text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  {sub.code}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                <span>{sub.location}</span>
                                {sub.manager && <span>· Manager: {sub.manager}</span>}
                                {sub.phone && <span>· {sub.phone}</span>}
                                {sub.capacity && <span>· Cap: {sub.capacity}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(sub)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white"
                              title="Edit Sub-Godown"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingId(sub.id);
                                setDeleteError(null);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                              title="Delete Sub-Godown"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT GODOWN MODAL */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingGodown
                    ? 'Alter Godown / Sub-Godown (গুদাম পরিবর্তন)'
                    : formParentId
                    ? 'Create Sub-Godown under Godown (সাব-গুদাম তৈরি)'
                    : 'Create Main Godown (প্রধান গুদাম তৈরি)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGodown} className="space-y-3.5 pt-3 text-xs">
              {/* Hierarchy Parent Selection */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60">
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Godown Hierarchy Tier (গুদাম স্তর):
                </label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
                >
                  <option value="">None — This is a Main Godown (প্রধান গুদাম)</option>
                  {mainGodowns.map((m) => (
                    <option key={m.id} value={m.id}>
                      Sub-Godown under: {m.name} ({m.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                  {formParentId
                    ? '✓ Will be linked as a child Sub-Godown under the chosen Main Godown.'
                    : '✓ Will be created as a Root Main Godown / Central Terminal Warehouse.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Godown Name (English) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Tejgaon Hub / Shed A"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bengali Name (বাংলা নাম)
                  </label>
                  <input
                    type="text"
                    value={formNameBn}
                    onChange={(e) => setFormNameBn(e.target.value)}
                    placeholder="e.g. তেজগাঁও প্রধান গুদাম"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Godown Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Branch (শাখা)
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location / Physical Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Plot 12, Industrial Area, Tejgaon, Dhaka"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Storage Capacity
                  </label>
                  <input
                    type="text"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    placeholder="e.g. 10,000 MT"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    placeholder="e.g. Rafiqul Islam"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+880 1711-..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                >
                  {editingGodown ? 'Update Godown' : 'Save & Register Godown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold">Confirm Godown Decommissioning</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this godown? This operation requires that no active sub-godowns belong to this facility.
            </p>
            {deleteError && (
              <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {deleteError}
              </div>
            )}
            <input
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Reason for deletion..."
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGodown}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
              >
                Delete Godown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
