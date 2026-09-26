import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Stethoscope,
  XCircle,
  Building,
} from 'lucide-react';
import Card, { CardContent } from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { appointmentApi } from '../../api/appointmentApi.js';

export const AppointmentCard = ({ appointment, onStatusChange }) => {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    setIsCancelling(true);
    try {
      await appointmentApi.updateStatus(appointment._id, 'cancelled');
      if (onStatusChange) {
        onStatusChange(appointment._id, 'cancelled');
      }
    } catch (err) {
      alert(`Could not cancel appointment: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const statusVariants = {
    scheduled: 'primary',
    'checked-in': 'info',
    'in-consultation': 'purple',
    completed: 'success',
    cancelled: 'default',
    'no-show': 'danger',
    bumped: 'warning',
  };

  const urgencyVariants = {
    routine: 'default',
    urgent: 'warning',
    emergency: 'danger',
  };

  return (
    <Card hoverEffect className={`overflow-hidden ${appointment.isDelayed ? 'border-amber-300' : ''}`}>
      {/* Real-time Emergency / Delay Notice Banner */}
      {appointment.isDelayed && (
        <div className="bg-linear-to-r from-amber-500 to-rose-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Emergency Delay: Appointment shifted to new estimated time</span>
          </div>
          {appointment.originalStartTime && (
            <span className="text-[10px] text-amber-100 font-mono">
              Was:{' '}
              {new Date(appointment.originalStartTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      )}

      <CardContent className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {appointment.doctorId?.name ? `Dr. ${appointment.doctorId.name}` : 'Physician Consultation'}
              </h4>
              <p className="text-xs text-slate-500">
                {appointment.doctorId?.doctorProfile?.specialty || 'General Care'} •{' '}
                {appointment.doctorId?.doctorProfile?.department || 'Outpatient Clinic'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={statusVariants[appointment.status] || 'default'} size="sm">
              {appointment.status}
            </Badge>
            {appointment.triage?.urgencyLevel && (
              <Badge variant={urgencyVariants[appointment.triage.urgencyLevel] || 'default'} size="sm">
                {appointment.triage.urgencyLevel}
              </Badge>
            )}
          </div>
        </div>

        {/* Timing and Resource Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>
              {new Date(appointment.startTime).toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>
              <strong>
                {new Date(appointment.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>{' '}
              ({appointment.durationMinutes} mins)
            </span>
          </div>

          {appointment.resourceId && (
            <div className="flex items-center gap-2 sm:col-span-2 text-slate-500 text-[11px] pt-1 border-t border-slate-200/50">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Room / Asset: <strong>{appointment.resourceId.name}</strong> (
                {appointment.resourceId.currentStatus})
              </span>
            </div>
          )}
        </div>

        {/* Triage summary snippet */}
        {appointment.triage?.aiSummary && (
          <p className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 italic">
            "{appointment.triage.aiSummary}"
          </p>
        )}

        {/* Action Buttons */}
        {appointment.status === 'scheduled' && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              isLoading={isCancelling}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
            >
              Cancel Booking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentCard;
