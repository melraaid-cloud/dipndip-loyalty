'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, MapPin, Radio, Edit2, Settings } from 'lucide-react';
import { branchesApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function BranchesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [geofenceEdit, setGeofenceEdit] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', nameAr: '', code: '', address: '', addressAr: '',
    city: 'Tripoli', latitude: '', longitude: '',
    geofenceRadius: 200, phone: '',
  });

  const { data: branches = [], isLoading, mutate } = useSWR(
    'branches/all',
    () => branchesApi.list().then((r) => r.data),
  );

  const handleCreate = async () => {
    try {
      await branchesApi.create({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        status: 'active',
      });
      toast.success('Branch created!');
      setShowCreate(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create branch');
    }
  };

  const handleGeofenceSave = async () => {
    if (!geofenceEdit) return;
    try {
      await branchesApi.updateGeofence(geofenceEdit.id, {
        radius: geofenceEdit.radius,
        message: geofenceEdit.message,
        messageAr: geofenceEdit.messageAr,
        enabled: geofenceEdit.enabled,
      });
      toast.success('Geofence updated!');
      setGeofenceEdit(null);
      mutate();
    } catch { toast.error('Failed to update geofence'); }
  };

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    temporarily_closed: 'bg-yellow-50 text-yellow-700',
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{branches.length} branches configured</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="skeleton h-5 w-48 mb-3 rounded" />
              <div className="skeleton h-4 w-full mb-2 rounded" />
            </div>
          ))
        ) : branches.map((branch: any) => (
          <div key={branch.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                    {branch.code && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">{branch.code}</span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[branch.status]}`}>
                      {branch.status?.replace('_', ' ')}
                    </span>
                  </div>
                  {branch.nameAr && <p className="text-sm text-gray-500" dir="rtl">{branch.nameAr}</p>}
                  <p className="text-sm text-gray-500 mt-1">{branch.address || branch.city}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {branch.latitude && (
                      <span className="flex items-center gap-1">
                        📍 {Number(branch.latitude).toFixed(4)}, {Number(branch.longitude).toFixed(4)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Radio className="h-3.5 w-3.5" />
                      Geofence: {branch.geofenceRadius || 200}m
                      {branch.geofenceConfig?.enabled === false && ' (disabled)'}
                    </span>
                    {branch.phone && <span>📞 {branch.phone}</span>}
                  </div>
                  {branch.geofenceConfig?.message && (
                    <p className="text-xs text-brand-600 mt-2 bg-brand-50 px-3 py-1.5 rounded-lg inline-block">
                      💬 "{branch.geofenceConfig.message}"
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setGeofenceEdit({
                  id: branch.id,
                  name: branch.name,
                  radius: branch.geofenceConfig?.radius || 200,
                  message: branch.geofenceConfig?.message || '',
                  messageAr: branch.geofenceConfig?.messageAr || '',
                  enabled: branch.geofenceConfig?.enabled !== false,
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100 transition-colors"
              >
                <Radio className="h-3.5 w-3.5" />
                Geofence
              </button>
            </div>
          </div>
        ))}

        {!isLoading && branches.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No branches yet. Add your first branch!</p>
          </div>
        )}
      </div>

      {/* Geofence Edit Modal */}
      {geofenceEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Geofence Settings</h3>
            <p className="text-sm text-gray-500 mb-6">{geofenceEdit.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Radius (meters)</label>
                <input
                  type="number"
                  min="50" max="5000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={geofenceEdit.radius}
                  onChange={(e) => setGeofenceEdit({ ...geofenceEdit, radius: +e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">Recommended: 100–500m for urban branches</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Message (EN)</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={2}
                  placeholder="You are near dipndip! Come in for a treat 🍫"
                  value={geofenceEdit.message}
                  onChange={(e) => setGeofenceEdit({ ...geofenceEdit, message: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Message (AR)</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={2}
                  dir="rtl"
                  placeholder="أنت بالقرب من ديب إن ديب! تعال للاستمتاع بحلوياتنا 🍫"
                  value={geofenceEdit.messageAr}
                  onChange={(e) => setGeofenceEdit({ ...geofenceEdit, messageAr: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="geofenceEnabled"
                  checked={geofenceEdit.enabled}
                  onChange={(e) => setGeofenceEdit({ ...geofenceEdit, enabled: e.target.checked })}
                  className="w-4 h-4 accent-brand-500"
                />
                <label htmlFor="geofenceEnabled" className="text-sm text-gray-700">Enable geofence notifications</label>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setGeofenceEdit(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleGeofenceSave} className="flex-1 btn-brand">Save Geofence</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Branch Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add Branch</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Name (EN) *', key: 'name', placeholder: 'dipndip Ain Zara' },
                { label: 'Name (AR)', key: 'nameAr', placeholder: 'ديب إن ديب عين زارة', dir: 'rtl' },
                { label: 'Branch Code', key: 'code', placeholder: 'AZ001' },
                { label: 'City', key: 'city', placeholder: 'Tripoli' },
                { label: 'Address (EN)', key: 'address', placeholder: 'Ain Zara Road, Tripoli', colSpan: true },
                { label: 'Latitude', key: 'latitude', placeholder: '32.8497' },
                { label: 'Longitude', key: 'longitude', placeholder: '13.1877' },
                { label: 'Phone', key: 'phone', placeholder: '+218 91 XXX XXXX' },
                { label: 'Geofence Radius (m)', key: 'geofenceRadius', type: 'number' },
              ].map(({ label, key, placeholder, dir, colSpan, type }) => (
                <div key={key} className={colSpan ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type || 'text'}
                    dir={dir}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} className="flex-1 btn-brand">Create Branch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
