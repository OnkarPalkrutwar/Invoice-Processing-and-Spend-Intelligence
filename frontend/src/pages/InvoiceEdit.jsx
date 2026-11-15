import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { formatINR } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';

export const InvoiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    vendorName: '',
    invoiceDate: '',
    dueDate: '',
    category: 'Services',
    poNumber: '',
    subtotal: 0,
    taxPercentage: 18,
    taxAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    discount: 0,
    totalAmount: 0,
    approvalStatus: 'PENDING_APPROVAL',
    paymentStatus: 'UNPAID',
    notes: '',
  });

  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const res = await invoiceService.getInvoiceById(id);
        if (res.success && res.data) {
          const inv = res.data.invoice;
          setFormData({
            invoiceNumber: inv.invoiceNumber || '',
            vendorName: inv.vendorName || '',
            invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
            dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
            category: inv.category || 'Services',
            poNumber: inv.poNumber || '',
            subtotal: inv.subtotal || 0,
            taxPercentage: inv.taxPercentage || 18,
            taxAmount: inv.taxAmount || 0,
            cgst: inv.cgst || 0,
            sgst: inv.sgst || 0,
            igst: inv.igst || 0,
            discount: inv.discount || 0,
            totalAmount: inv.totalAmount || 0,
            approvalStatus: inv.approvalStatus || 'PENDING_APPROVAL',
            paymentStatus: inv.paymentStatus || 'UNPAID',
            notes: inv.notes || '',
          });

          setLineItems(res.data.lineItems || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load invoice.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    if (field === 'subtotal' || field === 'taxPercentage' || field === 'discount') {
      const sub = parseFloat(updated.subtotal) || 0;
      const rate = parseFloat(updated.taxPercentage) || 0;
      const disc = parseFloat(updated.discount) || 0;
      const tax = (sub * rate) / 100;
      updated.taxAmount = Math.round(tax * 100) / 100;
      updated.totalAmount = Math.round((sub + tax - disc) * 100) / 100;
      updated.cgst = Math.round((tax / 2) * 100) / 100;
      updated.sgst = Math.round((tax / 2) * 100) / 100;
    }
    setFormData(updated);
  };

  const handleLineItemChange = (index, field, value) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].total = Math.round(qty * price * 100) / 100;
    }
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0, total: 0, taxRate: 18 },
    ]);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        lineItems,
      };
      const res = await invoiceService.updateInvoice(id, payload);
      if (res.success) {
        navigate(`/invoices/${id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading invoice editor..." />;
  if (error && !formData.invoiceNumber) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <Link
            to={`/invoices/${id}`}
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
            Edit Invoice #{formData.invoiceNumber}
          </h1>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary text-xs py-1.5 px-4"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : 'Save Modifications'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4 p-5">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Basic Metadata
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={formData.invoiceNumber}
                onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                className="input-field text-xs uppercase font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Supplier Legal Name *
              </label>
              <input
                type="text"
                required
                value={formData.vendorName}
                onChange={(e) => handleFieldChange('vendorName', e.target.value)}
                className="input-field text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Department Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                className="input-field text-xs"
              >
                <option value="Software">Software</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Hardware">Hardware</option>
                <option value="Travel">Travel</option>
                <option value="Utilities">Utilities</option>
                <option value="Marketing">Marketing</option>
                <option value="Services">Services</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                value={formData.invoiceDate}
                onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Payment Due Date *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                PO Reference
              </label>
              <input
                type="text"
                value={formData.poNumber}
                onChange={(e) => handleFieldChange('poNumber', e.target.value)}
                className="input-field text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Itemized Line Items
            </h3>
            <button
              type="button"
              onClick={addLineItem}
              className="text-xs font-medium text-slate-700 hover:text-zinc-950 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 w-28 text-right">Line Total</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                        className="input-field text-xs py-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                        className="input-field text-xs py-1 text-center font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                        className="input-field text-xs py-1 text-right font-mono"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900 text-right tabular-nums">
                      {formatINR(item.total)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="card space-y-4 p-5">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Financial & Tax Summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Subtotal (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => handleFieldChange('subtotal', e.target.value)}
                className="input-field text-xs font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Tax Percentage (GST %)
              </label>
              <input
                type="number"
                value={formData.taxPercentage}
                onChange={(e) => handleFieldChange('taxPercentage', e.target.value)}
                className="input-field text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(e) => handleFieldChange('discount', e.target.value)}
                className="input-field text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Grand Total Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.totalAmount}
                onChange={(e) => handleFieldChange('totalAmount', e.target.value)}
                className="input-field text-xs font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Internal Audit Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={2}
              className="input-field text-xs"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
