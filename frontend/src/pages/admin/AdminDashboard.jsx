import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  Layers,
  Tv,
  AlertOctagon,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ResourceMatrixGrid from '../../components/admin/ResourceMatrixGrid.jsx';
import LiveQueueBoard from '../../components/admin/LiveQueueBoard.jsx';

export const AdminDashboard = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'queue'

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Badge variant="danger" size="sm" className="mb-2.5 bg-rose-500/20 text-rose-200 border-rose-400/30">
            Hospital Operations Command
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Facility & Queue Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Real-time physical asset locking, live clinic waiting monitors, and emergency telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md" className="bg-white/10 text-white border-white/20">
            Admin: {user?.name || 'Administrator'}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('resources')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'resources'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Physical Resources Matrix
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tv className="w-4 h-4" />
          Live Clinic Waiting Monitor
        </button>
      </div>

      {/* Content based on selected tab */}
      {activeTab === 'resources' && <ResourceMatrixGrid />}
      {activeTab === 'queue' && <LiveQueueBoard />}
    </div>
  );
};

export default AdminDashboard;
