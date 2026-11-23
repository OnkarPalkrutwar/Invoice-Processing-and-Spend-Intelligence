import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  ArrowRight,
  Plus,
  Trash2,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { formatINR } from '../utils/formatters';

export const InvoiceUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [ocrResult, setOcrResult] = useState(null);

  // Extracted / Editable Review Form State
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
    currency: 'INR',
    notes: '',
  });

  const [lineItems, setLineItems] = useState([]);
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false);
  const [duplicateReason, setDuplicateReason] = useState('');
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    setError('');
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Invalid format. Please upload PDF, JPG, or PNG files only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }
    setSelectedFile(file);
    setOcrResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Upload and trigger OCR
  const handleProcessDocument = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError('');
    setUploadProgress(15);

    const uploadPayload = new FormData();
    uploadPayload.append('file', selectedFile);

    try {
      const res = await invoiceService.uploadInvoice(uploadPayload, (percent) => {
        setUploadProgress(Math.max(15, Math.min(90, percent)));
      });

      setUploadProgress(100);

      if (res.success && res.data) {
        const inv = res.data.invoice;
        setCreatedInvoiceId(inv._id);
        setOcrResult({
          confidence: inv.ocrConfidence || 0.9,
          ocrSuccess: res.data.ocrSuccess,
          message: res.data.ocrMessage,
        });

        const invSubtotal = Number(inv.subtotal) || 0;
        let invTaxRate = inv.taxPercentage !== undefined && inv.taxPercentage !== null ? Number(inv.taxPercentage) : 0;
        let invTaxAmount = Number(inv.taxAmount) || 0;
        let invTotal = Number(inv.totalAmount) || (invSubtotal + invTaxAmount);

        // If tax amount is 0 and subtotal equals total, GST is 0%
        if (invTaxAmount === 0 && (invTotal === invSubtotal || invSubtotal > 0)) {
          invTaxRate = 0;
        } else if (invTaxRate > 0 && invTaxAmount === 0 && invSubtotal > 0) {
          invTaxAmount = Math.round(((invSubtotal * invTaxRate) / 100) * 100) / 100;
          invTotal = Math.round((invSubtotal + invTaxAmount) * 100) / 100;
        }

        // Initialize review form with extracted data
        setFormData({
          invoiceNumber: inv.invoiceNumber || '',
          vendorName: inv.vendorName || '',
          invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
          category: inv.category || 'Services',
          poNumber: inv.poNumber || '',
          subtotal: invSubtotal,
          taxPercentage: invTaxRate,
          taxAmount: invTaxAmount,
          cgst: inv.cgst || (invTaxAmount > 0 ? Math.round((invTaxAmount / 2) * 100) / 100 : 0),
          sgst: inv.sgst || (invTaxAmount > 0 ? Math.round((invTaxAmount / 2) * 100) / 100 : 0),
          igst: inv.igst || 0,
          discount: inv.discount || 0,
          totalAmount: invTotal,
          currency: inv.currency || 'INR',
          notes: inv.notes || '',
        });

        if (res.data.extractedData?.lineItems && res.data.extractedData.lineItems.length > 0) {
          setLineItems(res.data.extractedData.lineItems);
        } else {
          setLineItems([
            {
              description: 'General goods / services',
              quantity: 1,
              unitPrice: inv.subtotal || inv.totalAmount,
              total: inv.subtotal || inv.totalAmount,
              taxRate: 18,
            },
          ]);
        }

        setIsDuplicateWarning(inv.isDuplicateWarning || false);
        setDuplicateReason(inv.duplicateReason || '');
      }
    } catch (err) {
      console.error('Upload & OCR failed:', err);
      setError(
        err.response?.data?.message ||
          'Failed to upload invoice. Ensure Python OCR service is running on port 8000.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Recalculate tax and grand total on change
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
      updated.igst = 0;
    }

    setFormData(updated);
  };

  // Line item helpers
  const handleLineItemChange = (index, field, value) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].total = Math.round(qty * price * 100) / 100;

      // Automatically recalculate subtotal, tax amount, and grand total from line items
      const newSubtotal = newItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
      const roundedSubtotal = Math.round(newSubtotal * 100) / 100;
      const rate = parseFloat(formData.taxPercentage) || 0;
      const disc = parseFloat(formData.discount) || 0;
      const tax = Math.round(((roundedSubtotal * rate) / 100) * 100) / 100;
      const total = Math.round((roundedSubtotal + tax - disc) * 100) / 100;

      setFormData((prev) => ({
        ...prev,
        subtotal: roundedSubtotal,
        taxAmount: tax,
        cgst: Math.round((tax / 2) * 100) / 100,
        sgst: Math.round((tax / 2) * 100) / 100,
        totalAmount: total,
      }));
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
    if (lineItems.length <= 1) return;
    const newItems = lineItems.filter((_, i) => i !== index);
    const newSubtotal = newItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
    const roundedSubtotal = Math.round(newSubtotal * 100) / 100;
    const rate = parseFloat(formData.taxPercentage) || 0;
    const disc = parseFloat(formData.discount) || 0;
    const tax = Math.round(((roundedSubtotal * rate) / 100) * 100) / 100;
    const total = Math.round((roundedSubtotal + tax - disc) * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      subtotal: roundedSubtotal,
      taxAmount: tax,
      cgst: Math.round((tax / 2) * 100) / 100,
      sgst: Math.round((tax / 2) * 100) / 100,
      totalAmount: total,
    }));
    setLineItems(newItems);
  };

  // Finalize and submit updated invoice
  const handleSaveAndConfirm = async () => {
    if (!createdInvoiceId) return;
    setIsSaving(true);
    setError('');

    try {
      const updatePayload = {
        ...formData,
        approvalStatus: 'PENDING_APPROVAL',
        lineItems,
      };

      const res = await invoiceService.updateInvoice(createdInvoiceId, updatePayload);
      if (res.success) {
        navigate(`/invoices/${createdInvoiceId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update invoice details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="pb-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Ingestion & Extraction</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest digital invoices (PDF, PNG, JPG) with OCR entity recognition and duplicate detection
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Drop Zone Card */}
      {!createdInvoiceId && (
        <div className="card">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-zinc-900 bg-slate-50 scale-[1.005]'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-700 shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-semibold text-slate-900">
              Drag and drop your invoice here, or{' '}
              <span className="text-slate-900 underline underline-offset-2">browse files</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports standard digital PDF, PNG, JPG, and JPEG documents up to 10MB
            </p>
          </div>

          {/* Selected File Preview Box */}
          {selectedFile && (
            <div className="mt-4 p-3.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                  {selectedFile.type === 'application/pdf' ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={isProcessing}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleProcessDocument}
                  disabled={isProcessing}
                  className="btn-primary text-xs py-1.5 px-3.5"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting OCR...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Process & Extract Entities</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isProcessing && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium mb-1.5">
                <span>Executing optical character recognition & entity parsing...</span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-zinc-900 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* OCR Review and Verification Form */}
      {createdInvoiceId && (
        <div className="space-y-6">
          {/* OCR Confidence Header */}
          <div
            className={`card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 ${
              ocrResult?.ocrSuccess === false
                ? 'border-l-amber-500 bg-amber-50/40'
                : 'border-l-emerald-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg border ${
                  ocrResult?.ocrSuccess === false
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {ocrResult?.ocrSuccess === false ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {ocrResult?.ocrSuccess === false
                    ? 'Manual Review Mode: OCR Service Notice'
                    : 'Document Extracted Successfully'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {ocrResult?.ocrSuccess === false
                    ? ocrResult.message || 'Automated OCR service connection was unavailable. Please enter details manually.'
                    : `Confidence Score: ${(ocrResult?.confidence * 100).toFixed(0)}% • Verify extracted values before submitting for manager approval.`}
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Draft Registered
            </span>
          </div>

          {/* Duplicate Detection Alert if flagged */}
          {isDuplicateWarning && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5" />
              <div>
                <p className="font-bold">Suspected Duplicate Invoice Detected</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">{duplicateReason}</p>
              </div>
            </div>
          )}

          {/* Review Form Fields */}
          <div className="card space-y-5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              1. General Invoice & Supplier Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                  className="input-field text-xs font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Vendor / Supplier *
                </label>
                <input
                  type="text"
                  value={formData.vendorName}
                  onChange={(e) => handleFieldChange('vendorName', e.target.value)}
                  className="input-field text-xs font-medium"
                  required
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
                  value={formData.invoiceDate}
                  onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Purchase Order (PO #)
                </label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => handleFieldChange('poNumber', e.target.value)}
                  placeholder="PO-APX-XXXX"
                  className="input-field text-xs font-mono"
                />
              </div>
            </div>

            {/* Line items section */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  2. Line Items & Description
                </h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-xs font-medium text-slate-700 hover:text-zinc-950 inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                      <th className="py-2.5 px-3 w-28 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 w-28 text-right">Line Total (₹)</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                            placeholder="Description of supply or service..."
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
                        <td className="py-2 px-3 font-mono font-medium text-slate-900 text-right tabular-nums">
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

            {/* Financial Totals & GST Summary */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Auditor Notes / Compliance Remarks
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Notes for finance auditor or manager..."
                  className="input-field text-xs"
                />
              </div>

              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal (Taxable Value):</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-slate-400">₹</span>
                    <input
                      type="number"
                      value={formData.subtotal}
                      onChange={(e) => handleFieldChange('subtotal', e.target.value)}
                      className="w-28 text-right input-field py-1 text-xs font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>GST Rate:</span>
                    <select
                      value={formData.taxPercentage}
                      onChange={(e) => handleFieldChange('taxPercentage', e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {formatINR(formData.taxAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Discount:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-slate-400">₹</span>
                    <input
                      type="number"
                      value={formData.discount}
                      onChange={(e) => handleFieldChange('discount', e.target.value)}
                      className="w-28 text-right input-field py-1 text-xs font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono font-bold text-base tabular-nums">
                    {formatINR(formData.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCreatedInvoiceId(null);
                  setSelectedFile(null);
                }}
                className="btn-secondary text-xs"
              >
                Upload Different File
              </button>

              <button
                type="button"
                onClick={handleSaveAndConfirm}
                disabled={isSaving}
                className="btn-primary text-xs py-2 px-4"
              >
                {isSaving ? 'Submitting to Ledger...' : 'Confirm & Submit to Approval Queue'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
