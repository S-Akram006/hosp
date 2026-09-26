import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useSocketStore } from '../../store/useSocketStore.js';
import { appointmentApi } from '../../api/appointmentApi.js';
import {
  Calendar,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import TriageChatDrawer from '../../components/patient/TriageChatDrawer.jsx';
import DynamicSlotPicker from '../../components/patient/DynamicSlotPicker.jsx';
import DocumentUploader from '../../components/patient/DocumentUploader.jsx';
import AppointmentCard from '../../components/patient/AppointmentCard.jsx';

export const PatientDashboard = () => {
  const { user } = useAuthStore();
  const { subscribe, unsubscribe } = useSocketStore();

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'ocr'
  const [isTriageOpen, setIsTriageOpen] = useState(false);
  const [triageContext, setTriageContext] = useState(null);
  const [isBookingActive, setIsBookingActive] = useState(false);
  const [liveDelayAlert, setLiveDelayAlert] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  const fetchAppointments = async () => {
    try {
      const res = await appointmentApi.getMyAppointments();
      if (res.data) {
        setAppointments(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    // Real-time listener for appointment delays
    const handleAppointmentDelayed = (data) => {
      console.log('[Socket] Patient received live delay notification:', data);
      setLiveDelayAlert(data);
      fetchAppointments();
    };

    subscribe('appointment:delayed', handleAppointmentDelayed);
    return () => unsubscribe('appointment:delayed', handleAppointmentDelayed);
  }, []);

  const handleTriageProceed = (result) => {
    setTriageContext(result);
    setIsBookingActive(true);
    setActiveTab('appointments');
  };

  const handleBookingSuccess = (newAppt) => {
    setIsBookingActive(false);
    setTriageContext(null);
    setSuccessBanner('Consultation appointment successfully booked and confirmed!');
    fetchAppointments();
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleOcrSaved = (structuredData) => {
    setSuccessBanner(
      `Intake document verified: ${structuredData.insurance?.provider || 'Insurance'} profile updated!`
    );
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const upcoming = appointments.filter(
    (a) => !['cancelled', 'completed'].includes(a.status)
  );

  return (
    <div className="space-y-6">
      {/* Real-time Emergency Delay Alert Banner */}
      {liveDelayAlert && (
        <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="font-bold text-sm">Real-Time Schedule Shift Notice</h4>
              <p className="text-xs text-rose-100 mt-0.5 leading-relaxed">
                {liveDelayAlert.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLiveDelayAlert(null)}
            className="text-xs text-rose-200 hover:text-white px-2 py-1 rounded-md bg-rose-700/60 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-cyan-900 via-teal-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-cyan-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative z-10 max-w-xl">
          <Badge variant="primary" size="sm" className="mb-3 bg-cyan-500/20 text-cyan-200 border-cyan-400/30">
            Patient Care Portal
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Hello, {user?.name || 'Patient'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            AI-driven symptom triage, intelligent appointment duration sizing, and live queue tracking.
          </p>
        </div>

        {/* Quick Launch Triage Button */}
        <Button
          variant="primary"
          size="lg"
          icon={Sparkles}
          onClick={() => setIsTriageOpen(true)}
          className="shrink-0 bg-white text-slate-900 hover:bg-slate-100 shadow-xl"
        >
          Check Symptoms with AI
        </Button>
      </div>

      {/* Tabs / Sub-nav */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => {
            setActiveTab('appointments');
            setIsBookingActive(false);
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'appointments' && !isBookingActive
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Scheduled Visits ({upcoming.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('ocr');
            setIsBookingActive(false);
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'ocr'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Intake Document OCR
        </button>

        {isBookingActive && (
          <button
            className="pb-3 text-xs sm:text-sm font-semibold border-b-2 border-cyan-600 text-cyan-700"
          >
            Booking In Progress ({triageContext?.recommendedSpecialty || 'General'})
          </button>
        )}
      </div>

      {/* Dynamic Slot Picker View (when triage completes) */}
      {isBookingActive && (
        <DynamicSlotPicker
          triageContext={triageContext}
          onBookingSuccess={handleBookingSuccess}
          onCancel={() => setIsBookingActive(false)}
        />
      )}

      {/* Intake OCR Tab */}
      {activeTab === 'ocr' && !isBookingActive && (
        <DocumentUploader onSaveSuccess={handleOcrSaved} />
      )}

      {/* Appointments List Tab */}
      {activeTab === 'appointments' && !isBookingActive && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Upcoming & Active Consultations
            </h2>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => {
                setTriageContext({
                  estimatedDurationMinutes: 20,
                  urgencyLevel: 'routine',
                  recommendedSpecialty: 'General Medicine',
                  rawSymptoms: 'Routine healthcare checkup',
                });
                setIsBookingActive(true);
              }}
            >
              Book New Appointment
            </Button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No appointments scheduled</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Check symptoms with our AI triage assistant to find the right specialist, or book directly.
              </p>
              <Button
                variant="primary"
                size="md"
                className="mt-4"
                icon={Sparkles}
                onClick={() => setIsTriageOpen(true)}
              >
                Start AI Symptom Triage
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  onStatusChange={fetchAppointments}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Triage Chat Drawer / Modal */}
      <TriageChatDrawer
        isOpen={isTriageOpen}
        onClose={() => setIsTriageOpen(false)}
        onProceedToBooking={handleTriageProceed}
      />
    </div>
  );
};

export default PatientDashboard;
