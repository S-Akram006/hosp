import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient.js';
import { useSocketStore } from '../../store/useSocketStore.js';
import {
  Layers,
  Activity,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wrench,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';

export const ResourceMatrixGrid = () => {
  const [resources, setResources] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    type: 'consultation_room',
    department: '',
  });

  const { subscribe, unsubscribe } = useSocketStore();

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/resources');
      if (res.data?.data) {
        setResources(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();

    // Listen to real-time resource updates from socket
    const handleResourceUpdate = (updatedData) => {
      console.log('[Socket] Received live resource update:', updatedData);
      setResources((prev) =>
        prev.map((r) =>
          r._id === updatedData.resourceId
            ? { ...r, currentStatus: updatedData.currentStatus, isOperational: updatedData.isOperational }
            : r
        )
      );
    };

    subscribe('resource:updated', handleResourceUpdate);
    return () => unsubscribe('resource:updated', handleResourceUpdate);
  }, []);

  const handleStatusChange = async (id, currentStatus) => {
    try {
      await axiosClient.put(`/resources/${id}/status`, { currentStatus });
      setResources((prev) =>
        prev.map((r) => (r._id === id ? { ...r, currentStatus } : r))
      );
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/resources', newResource);
      if (res.data?.data) {
        setResources((prev) => [...prev, res.data.data]);
        setIsAddModalOpen(false);
        setNewResource({ name: '', type: 'consultation_room', department: '' });
      }
    } catch (err) {
      alert(`Resource creation failed: ${err.message}`);
    }
  };

  const statusIcons = {
    available: CheckCircle2,
    occupied: Activity,
    sanitizing: Flame,
    maintenance: Wrench,
  };

  const statusVariants = {
    available: 'success',
    occupied: 'danger',
    sanitizing: 'warning',
    maintenance: 'default',
  };

  const filteredResources =
    filterType === 'all'
      ? resources
      : resources.filter((r) => r.type === filterType);

  return (
    <div className="space-y-4">
      {/* Top Filter and Add Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase mr-1">Filter Asset:</span>
          {[
            { label: 'All Assets', value: 'all' },
            { label: 'Exam Rooms', value: 'consultation_room' },
            { label: 'MRI Suites', value: 'mri' },
            { label: 'CT Scanners', value: 'ct_scan' },
            { label: 'X-Ray Units', value: 'xray' },
            { label: 'Ultrasound', value: 'ultrasound' },
            { label: 'Operation Theaters', value: 'operation_theater' },
          ].map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFilterType(cat.value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                filterType === cat.value
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchResources}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Resource
          </Button>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading hospital resource matrix...</div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
          No hospital resources match the selected category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => {
            const StatusIcon = statusIcons[resource.currentStatus] || Activity;

            return (
              <Card key={resource._id} hoverEffect className="relative overflow-hidden">
                <CardContent className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{resource.name}</h4>
                      <p className="text-xs text-slate-500 capitalize">
                        {resource.type.replace('_', ' ')} • {resource.department || 'General Facility'}
                      </p>
                    </div>
                    <Badge variant={statusVariants[resource.currentStatus] || 'default'} size="sm" dot>
                      {resource.currentStatus}
                    </Badge>
                  </div>

                  {/* Status Toggle Switcher */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                      Sync Room State (Broadcasts Live)
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {['available', 'occupied', 'sanitizing', 'maintenance'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(resource._id, st)}
                          className={`py-1 text-[10px] font-semibold rounded-md border capitalize transition-all cursor-pointer ${
                            resource.currentStatus === st
                              ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {st.slice(0, 5)}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Resource Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Hospital Equipment or Room"
        description="Register a new consultation room, scanner, or surgical theater in the hospital inventory."
      >
        <form onSubmit={handleCreateResource} className="space-y-4">
          <Input
            label="Resource Name"
            placeholder="e.g. Diagnostic MRI 3 or Consultation Room B-302"
            value={newResource.name}
            onChange={(e) => setNewResource((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Resource Category
            </label>
            <select
              value={newResource.type}
              onChange={(e) => setNewResource((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
            >
              <option value="consultation_room">Consultation Room</option>
              <option value="mri">MRI Scanner Suite</option>
              <option value="ct_scan">CT Scan Unit</option>
              <option value="xray">Digital X-Ray Room</option>
              <option value="ultrasound">Ultrasound Bay</option>
              <option value="operation_theater">Operation Theater (OT)</option>
            </select>
          </div>

          <Input
            label="Department"
            placeholder="e.g. Radiology, Cardiology, Surgery"
            value={newResource.department}
            onChange={(e) =>
              setNewResource((prev) => ({ ...prev, department: e.target.value }))
            }
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Resource
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResourceMatrixGrid;
