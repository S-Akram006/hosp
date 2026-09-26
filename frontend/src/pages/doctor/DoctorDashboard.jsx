import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useSocketStore } from '../../store/useSocketStore.js';
import { appointmentApi } from '../../api/appointmentApi.js';
import {
  Users,
  Clock,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Stethoscope,
  Activity,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

import PatientBriefingCard from '../../components/doctor/PatientBriefingCard.jsx';
import AmbientScribeWidget from '../../components/doctor/AmbientScribeWidget.jsx';
import SoapNoteEditor from '../../components/doctor/SoapNoteEditor.jsx';
import EmergencyOverrideModal from '../../components/doctor/EmergencyOverrideModal.jsx';

export const DoctorDashboard = () => {
  const { user } = useAuthStore();
  const { subscribe, unsubscribe } = useSocketStore();

  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [currentSoapNote, setCurrentSoapNote] = useState(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchDoctorAppointments = async () => {
    try {
      const res = await appointmentApi.getMyAppointments();
      if (res.data) {
        setAppointments(res.data);
        // Default select first waiting or scheduled appointment if none selected
        if (!selectedAppointment && res.data.length > 0) {
          const active =
            res.data.find((a) => ['in-consultation', 'checked-in'].includes(a.status)) ||
            res.data[0];
          setSelectedAppointment(active);
        }
      }
    } catch (err) {
      console.warn('Could not fetch doctor appointments:', err);
    }
  };

  useEffect(() => {
    fetchDoctorAppointments();

    // Listen to real-time emergency and queue status changes from Socket.io
    const handleQueueChange = () => {
      fetchDoctorAppointments();
    };

    subscribe('queue:status_changed', handleQueueChange);
    subscribe('emergency:triggered', handleQueueChange);

    return () => {
      unsubscribe('queue:status_changed', handleQueueChange);
      unsubscribe('emergency:triggered', handleQueueChange);
    };
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await appointmentApi.updateStatus(id, status);
      setActionNotice(`Consultation status changed to '${status}'`);
      fetchDoctorAppointments();
      if (selectedAppointment && selectedAppointment._id === id) {
        setSelectedAppointment((prev) => ({ ...prev, status }));
      }
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSoapGenerated = (generatedSoap) => {
    setCurrentSoapNote(generatedSoap);
    setActionNotice('Ambient transcript parsed into structured SOAP draft!');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSignedSuccess = (finalRecord) => {
    setActionNotice('Clinical consultation completed & SOAP record digitally signed!');
    fetchDoctorAppointments();
    if (selectedAppointment) {
      setSelectedAppointment((prev) => ({ ...prev, status: 'completed' }));
    }
    setTimeout(() => setActionNotice(null), 5000);
  };

  const waitingCount = appointments.filter((a) => a.status === 'checked-in').length;
  const inConsultCount = appointments.filter((a) => a.status === 'in-consultation').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-purple-950 via-slate-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Badge variant="purple" size="sm" className="mb-2.5 bg-purple-500/20 text-purple-200 border-purple-400/30">
            Physician Command Console
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Dr. {user?.name || 'Physician'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Specialty: {user?.doctorProfile?.specialty || 'General Care'} • Room:{' '}
            {user?.doctorProfile?.roomNumber || 'B-201'}
          </p>
        </div>

        <Button
          variant="danger"
          size="lg"
          icon={AlertOctagon}
          onClick={() => setIsOverrideModalOpen(true)}
        >
          Emergency Override
        </Button>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metric Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Today's Patients
          </span>
          <span className="text-2xl font-bold text-slate-900">{appointments.length}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Checked-In & Waiting
          </span>
          <span className="text-2xl font-bold text-amber-600">{waitingCount}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            In Consultation
          </span>
          <span className="text-2xl font-bold text-purple-600">{inConsultCount}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Completed Visits
          </span>
          <span className="text-2xl font-bold text-emerald-600">{completedCount}</span>
        </div>
      </div>

      {/* Main Clinical Workspace: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Daily Patient Queue */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-sm">Today's Patient Queue</CardTitle>
              <Badge variant="primary" size="sm">
                {appointments.length} Scheduled
              </Badge>
            </CardHeader>
            <CardContent className="p-0 max-h-[640px] overflow-y-auto divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No appointments scheduled for today.
                </div>
              ) : (
                appointments.map((a) => {
                  const isSelected = selectedAppointment?._id === a._id;
                  const isHighRisk = (a.noShowProbability || 0) >= 0.3;

                  return (
                    <div
                      key={a._id}
                      onClick={() => {
                        setSelectedAppointment(a);
                        setCurrentSoapNote(null);
                      }}
                      className={`p-4 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50/70 border-l-4 border-l-purple-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {a.patientId?.name || 'Patient'}
                            </span>
                            {a.isDelayed && (
                              <Badge variant="warning" size="sm">
                                Shifted
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            {new Date(a.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            • {a.durationMinutes} mins
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            size="sm"
                            variant={
                              a.status === 'in-consultation'
                                ? 'purple'
                                : a.status === 'checked-in'
                                ? 'warning'
                                : a.status === 'completed'
                                ? 'success'
                                : 'default'
                            }
                          >
                            {a.status}
                          </Badge>
                          <span
                            className={`text-[10px] font-semibold ${
                              isHighRisk ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            No-Show: {Math.round((a.noShowProbability || 0.05) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Quick Action row */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 capitalize">
                          {a.triage?.urgencyLevel || 'routine'} priority
                        </span>
                        <div className="space-x-1">
                          {a.status === 'checked-in' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(a._id, 'in-consultation');
                              }}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[11px] font-semibold"
                            >
                              Start Consult
                            </button>
                          )}
                          {a.status === 'in-consultation' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(a._id, 'completed');
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold"
                            >
                              Finish
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pre-consultation Briefing + Ambient Scribe & SOAP */}
        <div className="lg:col-span-7 space-y-6">
          {selectedAppointment ? (
            <>
              {/* 1. Patient Briefing Card */}
              <PatientBriefingCard appointment={selectedAppointment} />

              {/* 2. Ambient AI Scribe */}
              <AmbientScribeWidget
                appointmentId={selectedAppointment._id}
                onSoapGenerated={handleSoapGenerated}
              />

              {/* 3. SOAP Note & Prescription Editor */}
              <SoapNoteEditor
                appointmentId={selectedAppointment._id}
                initialSoapNote={currentSoapNote}
                onSignedSuccess={handleSignedSuccess}
              />
            </>
          ) : (
            <Card className="p-12 text-center text-slate-400 text-xs">
              Select a patient from the consultation queue to load medical briefing and ambient scribe.
            </Card>
          )}
        </div>
      </div>

      {/* Emergency Override Modal */}
      <EmergencyOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        doctorId={user?._id || user?.id}
        onSuccess={(res) => {
          setActionNotice(res.message);
          fetchDoctorAppointments();
          setTimeout(() => setActionNotice(null), 5000);
        }}
      />
    </div>
  );
};

export default DoctorDashboard;
