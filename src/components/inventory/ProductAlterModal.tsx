import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Trash2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Tag,
  Warehouse,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Product } from '../../types/erp';
import { formatBDT } from '../../utils/i18n';

interface ProductAlterModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductAlterModal: React.FC<ProductAlterModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { updateProduct, deleteProduct, godowns } = useERP();

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [code, setCode] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [uom, setUom] = useState('Pcs');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salesPrice, setSalesPrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(3);
  const [defaultGodownId, setDefaultGodownId] = useState<string>('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Discontinued product');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setNameBn(product.nameBn || '');
      setCode(product.code);
      setSku(product.sku);
      setBarcode(product.barcode);
      setCategory(product.category);
      setUom(product.uom);
      setPurchasePrice(product.purchasePrice);
      setSalesPrice(product.salesPrice);
      setWholesalePrice(product.wholesalePrice);
      setMinStockAlert(product.minStockAlert);
      setDefaultGodownId(product.defaultGodownId || '');
      setConfirmDelete(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const totalStock = Object.values(product.branchStock).reduce((a, b) => a + b, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }

    const success = updateProduct(product.id, {
      name: name.trim(),
      nameBn: nameBn.trim() || undefined,
      code: code.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      category: category.trim(),
      uom,
      purchasePrice: Number(purchasePrice) || 0,
      salesPrice: Number(salesPrice) || 0,
      wholesalePrice: Number(wholesalePrice) || Number(salesPrice) || 0,
      minStockAlert: Number(minStockAlert) || 1,
      defaultGodownId: defaultGodownId || undefined,
    });

    if (success) {
      setSuccessMsg('Product details updated successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setErrorMsg('Failed to update product attributes.');
    }
  };

  const handleDelete = () => {
    setErrorMsg(null);
    const success = deleteProduct(product.id, deleteReason);
    if (success) {
      onClose();
    } else {
      setErrorMsg('Failed to delete product.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Alter & Rename Product (পণ্য পরিবর্তন ও সংশোধন)
              </h2>
              <p className="text-xs text-slate-500">
                Editing merchandise item {product.code} · Total Stock: {totalStock} {product.uom}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name (English) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bengali Title (বাংলা নাম)
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="e.g. স্যামসাং গ্যালাক্সি মোবাইল"
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU Reference
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Barcode Number
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure (UOM)
              </label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="Pcs">Pieces (Pcs)</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Box">Box</option>
                <option value="Roll">Roll</option>
                <option value="Liter">Liter</option>
                <option value="Bag">Bag (বস্তা)</option>
                <option value="Carton">Carton</option>
                <option value="Set">Set</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Godown
              </label>
              <select
                value={defaultGodownId}
                onChange={(e) => setDefaultGodownId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="">-- No Default Godown --</option>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.parentId ? '↳ Sub: ' : 'Main: '} {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Purchase Cost (৳)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Retail Sales Price (৳)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={salesPrice}
                onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Wholesale Price (৳)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Min Stock Alert
              </label>
              <input
                type="number"
                min="1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 1)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-center font-bold text-rose-600"
              />
            </div>
          </div>

          {/* Delete Option Section */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            {!confirmDelete ? (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove / Delete Product (পণ্য ডিলিট করুন)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    Save Changes (সংরক্ষণ করুন)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Are you sure you want to permanently delete this product?
                </p>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Reason for deletion..."
                  className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded text-slate-900 dark:text-white"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
