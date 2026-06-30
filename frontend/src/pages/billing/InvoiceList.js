// InvoiceList.js
// Shows all invoices with option to view PDF or print thermal receipt

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import ThermalReceipt from '../../components/ui/ThermalReceipt';
import {
  FiFileText, FiEye,
  FiCalendar, FiUser
} from 'react-icons/fi';

// Format currency
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);

// Format date
const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

const InvoiceList = () => {
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);

  const [receiptInvoice, setReceiptInvoice] = useState(null);
  const [receiptWidth, setReceiptWidth]     = useState('80mm');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  currentPage,
        limit: 15,
        ...(search && { search }),
      });
      const res = await api.get(`/billing/invoices?${params}`);
      setInvoices(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalInvoices(res.data.pagination.totalInvoices);
    } catch {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [currentPage, search]);

  // Open PDF in new tab
  const viewPDF = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const url   = `http://localhost:5000/api/billing/invoice/${invoiceId}/pdf`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob    = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

// Print thermal receipt
  const printReceipt = async (invoiceId, width) => {
    try {
      const res = await api.get(`/billing/invoice/${invoiceId}`);

      if (!res.data.data.items || res.data.data.items.length === 0) {
        toast.error('Invoice has no items to print');
        return;
      }

      setReceiptWidth(width);
      setReceiptInvoice(res.data.data);

      // Wait for React to render the portal content before printing
      setTimeout(() => {
        window.print();
      }, 400);

    } catch (error) {
      console.error('Receipt print error:', error);
      toast.error('Failed to load invoice for receipt');
    }
  };

  // Payment method badge color
  const getPaymentBadge = (method) => {
    const colors = {
      cash: 'badge-green',
      card: 'badge-blue',
      upi:  'badge-yellow',
    };
    return colors[method] || 'badge-gray';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalInvoices} invoices total
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          placeholder="Search by invoice number, customer name..."
        />
      </div>

      {/* Invoices Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10
                            border-b-2 border-blue-600" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20">
            <FiFileText className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Payment</th>
                  <th className="table-header">GST</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}
                      className="hover:bg-gray-50 transition-colors">

                    {/* Invoice Number */}
                    <td className="table-cell">
                      <span className="font-mono font-semibold text-blue-600">
                        {inv.invoice_number}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {inv.customer_name || 'Walk-in Customer'}
                          </p>
                          {inv.customer_phone && (
                            <p className="text-xs text-gray-400">
                              {inv.customer_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="table-cell">
                      <div className="flex items-center gap-1 text-gray-500">
                        <FiCalendar className="text-xs flex-shrink-0" />
                        <span className="text-xs">
                          {formatDate(inv.created_at)}
                        </span>
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="table-cell">
                      <span className={getPaymentBadge(inv.payment_method)}>
                        {(inv.payment_method || 'cash').toUpperCase()}
                      </span>
                    </td>

                    {/* GST */}
                    <td className="table-cell text-gray-600">
                      {formatCurrency(inv.total_gst)}
                    </td>

                    {/* Total */}
                    <td className="table-cell">
                      <span className="font-bold text-green-600">
                        {formatCurrency(inv.total_amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewPDF(inv.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5
                                     bg-blue-50 text-blue-600 rounded-lg
                                     hover:bg-blue-100 transition-colors
                                     text-xs font-medium"
                          title="View/Download A4 PDF"
                        >
                          <FiEye className="text-sm" />
                          PDF
                        </button>
                        <button
                          onClick={() => printReceipt(inv.id, '80mm')}
                          className="flex items-center gap-1 px-2.5 py-1.5
                                     bg-green-50 text-green-600 rounded-lg
                                     hover:bg-green-100 transition-colors
                                     text-xs font-medium"
                          title="Print Thermal Receipt (80mm)"
                        >
                          Receipt
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && invoices.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {receiptInvoice && (
        <ThermalReceipt invoice={receiptInvoice} width={receiptWidth} />
      )}
    </div>
  );
};

export default InvoiceList;