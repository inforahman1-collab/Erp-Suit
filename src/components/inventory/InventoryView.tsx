import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  ArrowRightLeft,
  SlidersHorizontal,
  Search,
  AlertTriangle,
  History,
  Barcode,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CheckCircle,
  Warehouse,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Product, StockMovement } from '../../types/erp';
import { formatBDT, formatDateBD, translations } from '../../utils/i18n';
import { GodownManager } from './GodownManager';
import { ProductAlterModal } from './ProductAlterModal';

export const InventoryView: React.FC = () => {
  const {
    language,
    currentCompany,
    currentBranchId,
    branches,
    products,
    stockMovements,
    godowns,
    addProduct,
    adjustStock,
    transferStock,
  } = useERP();

  const t = translations[language];
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'godowns' | 'movements'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [alteringProduct, setAlteringProduct] = useState<Product | null>(null);

  // Modals
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenAdjustModal, setIsOpenAdjustModal] = useState(false);
  const [isOpenTransferModal, setIsOpenTransferModal] = useState(false);

  // Form states
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Home Appliances');
  const [newProdUom, setNewProdUom] = useState('Pcs');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState(0);
  const [newProdSalesPrice, setNewProdSalesPrice] = useState(0);
  const [newProdWholesalePrice, setNewProdWholesalePrice] = useState(0);
  const [newProdInitialStock, setNewProdInitialStock] = useState(10);
  const [newProdMinStock, setNewProdMinStock] = useState(3);

  // Adjust Form
  const [adjustProductId, setAdjustProductId] = useState(products[0]?.id || '');
  const [adjustBranchId, setAdjustBranchId] = useState(branches[0]?.id || '');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'adjustment_in' | 'adjustment_out'>('adjustment_in');
  const [adjustNote, setAdjustNote] = useState('');

  // Transfer Form
  const [transferProductId, setTransferProductId] = useState(products[0]?.id || '');
  const [transferFromBranch, setTransferFromBranch] = useState(branches[0]?.id || '');
  const [transferToBranch, setTransferToBranch] = useState(branches[1]?.id || branches[0]?.id || '');
  const [transferQty, setTransferQty] = useState(1);
  const [transferNote, setTransferNote] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      const totalStock = Object.values(p.branchStock).reduce((a, b) => a + b, 0);
      if (filterLowStockOnly && totalStock > p.minStockAlert) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = p.barcode.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesCode) return false;
      }
      return true;
    });
  }, [products, selectedCategory, filterLowStockOnly, searchQuery]);

  // Handle Add Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    addProduct({
      name: newProdName,
      sku: newProdSku || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: newProdBarcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      category: newProdCategory,
      uom: newProdUom,
      purchasePrice: Number(newProdPurchasePrice) || 0,
      salesPrice: Number(newProdSalesPrice) || 0,
      wholesalePrice: Number(newProdWholesalePrice) || Number(newProdSalesPrice) || 0,
      openingStock: Number(newProdInitialStock) || 0,
      minStockAlert: Number(newProdMinStock) || 3,
    });

    setIsOpenAddModal(false);
    setNewProdName('');
  };

  // Handle Adjust Stock
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId) return;
    adjustStock(adjustProductId, adjustBranchId, adjustQty, adjustType, adjustNote);
    setIsOpenAdjustModal(false);
    setAdjustNote('');
  };

  // Handle Transfer Stock
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    if (transferFromBranch === transferToBranch) {
      setTransferError('Origin and destination branch cannot be the same.');
      return;
    }
    const success = transferStock(transferProductId, transferFromBranch, transferToBranch, transferQty, transferNote);
    if (success) {
      setIsOpenTransferModal(false);
      setTransferNote('');
    } else {
      setTransferError('Insufficient stock at origin branch for this transfer.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.inventory}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            SKU management, barcode tracking, multi-branch stock levels, and real-time reconciliation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 1 && (
            <button
              onClick={() => setIsOpenTransferModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Branch Transfer</span>
            </button>
          )}

          <button
            onClick={() => setIsOpenAdjustModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>Stock Adjustment</span>
          </button>

          <button
            onClick={() => setIsOpenAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newProduct}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Catalog vs Movement Audit */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'catalog'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Product Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveSubTab('godowns')}
          className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'godowns'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>Godowns & Sub-Godowns (গুদাম ও সাব-গুদাম) ({godowns.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('movements')}
          className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'movements'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Stock Movement Audit ({stockMovements.length})</span>
        </button>
      </div>

      {activeSubTab === 'catalog' ? (
        <>
          {/* Filters & Search Header */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan barcode or search SKU/name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-48 text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLowStockOnly}
                  onChange={(e) => setFilterLowStockOnly(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Low Stock Only
                </span>
              </label>

              <span className="text-xs text-slate-400 font-mono">
                {filteredProducts.length} items listed
              </span>
            </div>
          </div>

          {/* Product Grid Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Item Details</th>
                    <th className="py-2.5 px-4">SKU / Barcode</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">Cost Price (৳)</th>
                    <th className="py-2.5 px-4 text-right">Retail (৳)</th>
                    <th className="py-2.5 px-4 text-right">Wholesale (৳)</th>
                    <th className="py-2.5 px-4 text-center">Stock by Branch</th>
                    <th className="py-2.5 px-4 text-right">Total Stock</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No merchandise found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const totalStock = Object.values(p.branchStock).reduce((a, b) => a + b, 0);
                      const isLow = totalStock <= p.minStockAlert;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Code: {p.code} · UOM: {p.uom}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono">
                            <div className="text-slate-800 dark:text-slate-200 font-semibold">{p.sku}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Barcode className="w-3 h-3" />
                              {p.barcode}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                            {p.category}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                            {formatBDT(p.purchasePrice)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatBDT(p.salesPrice)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                            {formatBDT(p.wholesalePrice)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {branches.map((b) => (
                                <span
                                  key={b.id}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                  title={b.name}
                                >
                                  {b.code}: {p.branchStock[b.id] || 0}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-xs tabular-nums ${
                                isLow
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              }`}
                            >
                              {totalStock} {p.uom}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setAlteringProduct(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                              title="Alter / Edit Product Name, SKU, Prices & Godown"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Alter (অল্টার)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === 'godowns' ? (
        <GodownManager />
      ) : (
        /* Stock Movement Audit Log */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Reference</th>
                  <th className="py-2.5 px-4 text-right">Qty</th>
                  <th className="py-2.5 px-4">Note / Reason</th>
                  <th className="py-2.5 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-500">{formatDateBD(m.date)}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{m.productName}</td>
                      <td className="py-2.5 px-4 uppercase text-[10px] font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            m.quantity > 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">{m.refNo}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                        <span className={m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{m.note || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{m.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {isOpenAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Register New Product</h3>
              <button onClick={() => setIsOpenAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. Walton Primo Smartphone 64GB"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    placeholder="e.g. WLT-PR-64"
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    placeholder="Scan or leave blank for auto"
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measurement (UOM)
                  </label>
                  <select
                    value={newProdUom}
                    onChange={(e) => setNewProdUom(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Kg">Kg (Kilogram)</option>
                    <option value="Box">Box</option>
                    <option value="Liter">Liter</option>
                    <option value="Dozen">Dozen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Cost (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdPurchasePrice}
                    onChange={(e) => setNewProdPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Retail Price (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdSalesPrice}
                    onChange={(e) => setNewProdSalesPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wholesale (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdWholesalePrice}
                    onChange={(e) => setNewProdWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdInitialStock}
                    onChange={(e) => setNewProdInitialStock(parseInt(e.target.value) || 0)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProdMinStock}
                    onChange={(e) => setNewProdMinStock(parseInt(e.target.value) || 1)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isOpenAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                Physical Stock Adjustment / Reconciliation
              </h3>
              <button onClick={() => setIsOpenAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product
                </label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch
                  </label>
                  <select
                    value={adjustBranchId}
                    onChange={(e) => setAdjustBranchId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="adjustment_in">Increase Stock (+)</option>
                    <option value="adjustment_out">Decrease / Damage (-)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Reconciliation Note <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Physical inventory count variance / Damaged carton in transit"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpenAdjustModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRANCH TRANSFER MODAL */}
      {isOpenTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                Inter-Branch Stock Transfer
              </h3>
              <button onClick={() => setIsOpenTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferError && (
              <div className="mt-3 p-2.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {transferError}
              </div>
            )}

            <form onSubmit={handleSaveTransfer} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product to Transfer
                </label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    From Origin Branch
                  </label>
                  <select
                    value={transferFromBranch}
                    onChange={(e) => setTransferFromBranch(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To Destination Branch
                  </label>
                  <select
                    value={transferToBranch}
                    onChange={(e) => setTransferToBranch(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Notes
                </label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Stock replenishment for weekend sale"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsOpenTransferModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT ALTER & RENAME MODAL */}
      <ProductAlterModal
        isOpen={!!alteringProduct}
        product={alteringProduct}
        onClose={() => setAlteringProduct(null)}
      />
    </div>
  );
};
