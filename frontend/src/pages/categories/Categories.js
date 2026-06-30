// Categories.js
// Full category management page

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { FiPlus, FiEdit2, FiTrash2, FiTag } from 'react-icons/fi';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [formData, setFormData]     = useState({ name: '', description: '' });
  const [saving, setSaving]         = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setSelected(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setSelected(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/categories/${selected.id}`, formData);
        toast.success('Category updated!');
      } else {
        await api.post('/categories', formData);
        toast.success('Category added!');
      }
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${selected.id}`);
      toast.success('Category deleted!');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage product categories
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <FiPlus /> Add Category
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 
                          border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <FiTag className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {cat.product_count} products
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 text-blue-600 hover:bg-blue-50 
                               rounded-lg transition-colors"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => { setSelected(cat); setShowDelete(true); }}
                    className="p-2 text-red-600 hover:bg-red-50 
                               rounded-lg transition-colors"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
              {cat.description && (
                <p className="text-gray-500 text-sm mt-3 border-t 
                              border-gray-100 pt-3">
                  {cat.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selected ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Category Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Electrical"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => setFormData(p => ({
                ...p, description: e.target.value
              }))}
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
              {saving ? 'Saving...' : selected ? 'Update' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${selected?.name}"? Products in this category will be uncategorized.`}
      />
    </div>
  );
};

export default Categories;