import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiImage, FiSettings } from 'react-icons/fi';

const CONDITIONS = [
  'New', 'Used - Like New', 'Used - Good', 'Used - Fair',
];

const AVAILABILITY_OPTIONS = [
  'List as Single Item',
  'List as In Stock',
];

const EMPTY_FORM = {
  tabsCount: 10,
  title: '',
  price: '',
  condition: 'Used - Like New',
  availability: 'List as Single Item',
  description: '',
  locations: '',
  images: [],
};

export default function Listings({ listings, setListings }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // ─── Image Upload ───
  const handleImageUpload = async () => {
    const paths = await window.electronAPI?.importImages();
    if (paths && paths.length > 0) {
      setForm((prev) => ({ ...prev, images: [...prev.images, ...paths] }));
    }
  };

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // ─── Configuration Form ───
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return;

    const locArray = form.locations
      .split('\n')
      .map(l => l.trim())
      .filter(l => l);

    const count = parseInt(form.tabsCount) || 1;
    const newListings = [];

    for (let i = 0; i < count; i++) {
      const location = locArray.length > 0 ? locArray[i % locArray.length] : '';
      const image = form.images.length > 0 
        ? [form.images[Math.floor(Math.random() * form.images.length)]] 
        : [];

      newListings.push({
        id: `tab-${Date.now()}-${i}`,
        title: form.title,
        price: parseFloat(form.price),
        condition: form.condition,
        availability: form.availability,
        description: form.description,
        location: location,
        images: image,
        status: 'Pending',
      });
    }

    setListings((prev) => [...prev, ...newListings]);
    // Optionally reset form after generate, or keep it so user can generate more
    // setForm({ ...EMPTY_FORM });
  };

  const handleDelete = (id) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const clearAll = () => {
    setListings([]);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Bulk Campaign Setup</h1>
        <p className="page-subtitle">Configure data to auto-generate multiple Marketplace tabs</p>
      </div>

      {/* Campaign Configuration Form */}
      <form onSubmit={handleGenerate} style={{ marginBottom: '24px' }}>
        <div className="glass-card">
          <div className="glass-card-header">
            <span className="glass-card-title">
              <FiSettings style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Campaign Configuration
            </span>
          </div>

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Number of Tabs (1 - 40) *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="40"
                value={form.tabsCount}
                onChange={(e) => handleFormChange('tabsCount', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                placeholder="e.g. iPhone 13 Pro Max"
                value={form.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 850"
                value={form.price}
                onChange={(e) => handleFormChange('price', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Condition</label>
              <select
                className="form-select"
                value={form.condition}
                onChange={(e) => handleFormChange('condition', e.target.value)}
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Availability</label>
              <select
                className="form-select"
                value={form.availability}
                onChange={(e) => handleFormChange('availability', e.target.value)}
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Locations (One per line)</label>
              <textarea
                className="form-textarea"
                placeholder="Lahore&#10;Karachi&#10;Islamabad"
                value={form.locations}
                onChange={(e) => handleFormChange('locations', e.target.value)}
                rows={4}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Enter product description..."
                value={form.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Images Pool</label>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Select multiple images. The bot will choose 1 random image from this pool for each tab.
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', maxWidth: '300px' }}
                onClick={handleImageUpload}
              >
                <FiImage style={{ marginRight: '6px' }} />
                Select Images
              </button>
              {form.images.length > 0 && (
                <div className="image-preview-grid" style={{ marginTop: '12px' }}>
                  {form.images.map((img, i) => (
                    <div key={i} className="image-preview-item">
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        padding: '4px',
                        wordBreak: 'break-all',
                      }}>
                        🖼️
                      </div>
                      <button
                        type="button"
                        className="image-preview-remove"
                        onClick={() => removeImage(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              <FiPlus style={{ marginRight: '4px' }} />
              Generate {form.tabsCount > 0 ? form.tabsCount : 1} Tabs in Queue
            </button>
          </div>
        </div>
      </form>

      {/* Generated Queue Preview */}
      <div className="glass-card">
        <div className="glass-card-header">
          <span className="glass-card-title">
            Generated Queue ({listings.length})
          </span>
          {listings.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={clearAll}>
              <FiTrash2 style={{ marginRight: '4px' }} /> Clear All
            </button>
          )}
        </div>

        {listings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">Queue is empty</div>
            <div className="empty-state-hint">Fill out the configuration above to generate tabs</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tab #</th>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Image Assigned</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing, index) => (
                  <tr key={listing.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                    <td>{listing.title}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {listing.location || 'None'}
                    </td>
                    <td>{listing.images?.length > 0 ? '✓ Yes' : '✗ No'}</td>
                    <td>
                      <span className={`status-badge ${listing.status.toLowerCase()}`}>
                        <span className="status-badge-dot"></span>
                        {listing.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-icon-only delete"
                        onClick={() => handleDelete(listing.id)}
                        title="Delete Tab"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
