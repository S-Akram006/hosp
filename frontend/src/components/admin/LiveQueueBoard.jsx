import React, { useState, useEffect } from 'react';
import { queueApi } from '../../api/queueApi.js';
import { useSocketStore } from '../../store/useSocketStore.js';
import {
  Tv,
  Clock,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BellRing,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';

export const LiveQueueBoard = () => {
  const [queueData, setQueueData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestAlert, setLatestAlert] = useState(null);

  const { subscribe, unsubscribe } = useSocketStore();

  const fetchLiveQueue = async () => {
    try {
      const res = await queueApi.getLiveQueue();
      setQueueData(res);
    } catch (err) {
      console.warn('Failed to fetch live queue telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveQueue();

    // Listen to real-time queue changes from Socket.io
    const handleQueueChange = (payload) => {
      console.log('[Socket] Queue status updated:', payload);
      fetchLiveQueue();
    };

    const handleEmergencyAlert = (emergency) => {
      console.log('[Socket] Emergency alert received:', emergency);
      setLatestAlert(emergency);
      fetchLiveQueue();
    };

    subscribe('queue:status_changed', handleQueueChange);
    subscribe('queue:updated', handleQueueChange);
    subscribe('emergency:alert', handleEmergencyAlert);

    return () => {
      unsubscribe('queue:status_changed', handleQueueChange);
      unsubscribe('queue:updated', handleQueueChange);
      unsubscribe('emergency:alert', handleEmergencyAlert);
    };
  }, []);

  const metrics = queueData?.metrics || {};
  const waitingTickets = queueData?.waitingTickets || [];
  const activeConsultations = queueData?.currentConsultations || [];

  return (
    <div className="space-y-5">
      {/* Real-Time Emergency Alert Banner */}
      {latestAlert && (
        <div className="p-4 bg-rose-600 text-white rounded-xl shadow-lg flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-white animate-ping" />
            <div>
              <span className="font-bold text-sm block">
                EMERGENCY OVERRIDE BROADCASTED: Dr. {latestAlert.doctorName}
              </span>
              <span className="text-xs text-rose-100">
                Reason: "{latestAlert.reason}" • All affected appointments shifted by +
                {latestAlert.delayMinutes} mins.
              </span>
            </div>
          </div>
          <button
            onClick={() => setLatestAlert(null)}
            className="text-xs text-rose-200 hover:text-white px-2 py-1 rounded-md bg-rose-700/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">
              Waiting in Clinic
            </span>
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            {metrics.waitingCount || 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Checked in & triaged</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">
              In Consultation
            </span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            {metrics.inConsultationCount || 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Active exam rooms</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">
              Average Wait Delay
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            {metrics.averageDelayMinutes || 0}m
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Calculated delay shift</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] uppercase font-bold tracking-wider">
              Completed Visits
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            {metrics.completedCount || 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Records signed & closed</span>
        </div>
      </div>

      {/* Two Column Layout: Active Consultations & Waiting Room Screen Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Consultations */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Active Consultations</CardTitle>
            <Badge variant="purple" size="sm" dot>
              In Progress
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeConsultations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No consultations currently in progress.
              </p>
            ) : (
              activeConsultations.map((c, i) => (
                <div key={i} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-purple-950 block">
                      {c.doctorName}
                    </span>
                    <span className="text-[11px] text-slate-500">{c.roomNumber}</span>
                  </div>
                  <Badge variant="purple" size="sm">
                    {c.ticketNumber}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Public Waiting Room Screen Simulation */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-cyan-600" />
              <CardTitle className="text-sm">Clinic Display Monitor Stream (PII Safe)</CardTitle>
            </div>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchLiveQueue}>
              Sync
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {waitingTickets.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Waiting room is currently clear.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5">Ticket #</th>
                      <th className="px-4 py-2.5">Patient ID</th>
                      <th className="px-4 py-2.5">Assigned Physician</th>
                      <th className="px-4 py-2.5">Est. Time</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waitingTickets.map((t) => (
                      <tr key={t.appointmentId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-cyan-700">
                          {t.ticketNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{t.patientToken}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {t.doctorName} ({t.specialty})
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(t.estimatedStartTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            size="sm"
                            variant={t.status === 'in-consultation' ? 'purple' : 'warning'}
                            dot
                          >
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveQueueBoard;
