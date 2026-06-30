// Suppliers.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import { FiPlus, FiEdit2, FiTrash2, FiTruck, FiPhone, FiMail } from 'react-icons/fi';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [formData, setFormData]   = useState({
    name: '', contact_person: '', phone: '',
    email: '', address: '', gstin: ''
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/suppliers${search ? `?search=${search}` : ''}`);
      setSuppliers(res.data.data);
    } catch {
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, [search]);

  const openAdd = () => {
    setSelected(null);
    setFormData({
      name: '', contact_person: '', phone: '',
      email: '', address: '', gstin: ''
    });
    setShowModal(true);
  };

  const openEdit = (sup) => {
    setSelected(sup);
    setFormData({
      name:           sup.name           || '',
      contact_person: sup.contact_person || '',
      phone:          sup.phone          || '',
      email:          sup.email          || '',
      address:        sup.address        || '',
      gstin:          sup.gstin          || '',
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/suppliers/${selected.id}`, formData);
        toast.success('Supplier updated!');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier added!');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/suppliers/${selected.id}`);
      toast.success('Supplier deleted!');
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your suppliers
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <FiPlus /> Add Supplier
        </button>
      </div>

      <div className="card mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers..."
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 
                          border-b-2 border-blue-600" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="card text-center py-20">
          <FiTruck className="text-5xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <FiTruck className="text-green-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{sup.name}</h3>
                    {sup.contact_person && (
                      <p className="text-gray-500 text-xs">{sup.contact_person}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(sup)}
                    className="p-2 text-blue-600 hover:bg-blue-50 
                               rounded-lg transition-colors"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => { setSelected(sup); setShowDelete(true); }}
                    className="p-2 text-red-600 hover:bg-red-50 
                               rounded-lg transition-colors"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              <div className="space-y-1 border-t border-gray-100 pt-3">
                {sup.phone && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <FiPhone className="text-gray-400" /> {sup.phone}
                  </p>
                )}
                {sup.email && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <FiMail className="text-gray-400" /> {sup.email}
                  </p>
                )}
                {sup.gstin && (
                  <p className="text-xs text-gray-400">GSTIN: {sup.gstin}</p>
                )}
                <p className="text-xs text-blue-600 font-medium">
                  {sup.product_count} products
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selected ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Supplier Name *</label>
            <input
              type="text"
              name="name"
              className="input-field"
              placeholder="e.g. Sharma Hardware Suppliers"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Contact Person</label>
              <input
                type="text"
                name="contact_person"
                className="input-field"
                placeholder="Name"
                value={formData.contact_person}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input
                type="text"
                name="phone"
                className="input-field"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              name="email"
              className="input-field"
              placeholder="supplier@email.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="input-label">Address</label>
            <textarea
              name="address"
              className="input-field resize-none"
              rows={2}
              placeholder="Full address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="input-label">GSTIN</label>
            <input
              type="text"
              name="gstin"
              className="input-field"
              placeholder="27AAPFU0939F1ZV"
              value={formData.gstin}
              onChange={handleChange}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : selected ? 'Update' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Delete "${selected?.name}"?`}
      />
    </div>
  );
};

export default Suppliers;