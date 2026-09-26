import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/authApi.js';
import { appointmentApi } from '../../api/appointmentApi.js';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

export const DynamicSlotPicker = ({ triageContext, onBookingSuccess, onCancel }) => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // default tomorrow
  );
  const [existingSchedule, setExistingSchedule] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // { startTime, endTime }
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  const durationMinutes = triageContext?.estimatedDurationMinutes || 20;

  // 1. Fetch available doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      try {
        const specialty = triageContext?.recommendedSpecialty;
        let res = await authApi.getDoctors(specialty);
        // If no doctors match exact specialty, fetch all doctors
        if (!res.data || res.data.length === 0) {
          res = await authApi.getDoctors();
        }
        if (res.data && res.data.length > 0) {
          setDoctors(res.data);
          setSelectedDoctorId(res.data[0]._id);
        }
      } catch (err) {
        console.warn('Failed to load doctors:', err);
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, [triageContext]);

  // 2. Fetch doctor schedule when selectedDoctorId or selectedDate changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    const fetchSchedule = async () => {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await appointmentApi.getDoctorSchedule(selectedDoctorId, selectedDate);
        if (res.data) {
          setExistingSchedule(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch schedule:', err);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSchedule();
  }, [selectedDoctorId, selectedDate]);

  // 3. Generate candidate slots for the selected day based on dynamic duration
  const generateSlots = () => {
    const slots = [];
    const [year, month, day] = selectedDate.split('-').map(Number);

    // Business hours: 09:00 to 17:00 (540 mins to 1020 mins)
    let currentMinutes = 9 * 60; // 09:00
    const endOfDayMinutes = 17 * 60; // 17:00

    while (currentMinutes + durationMinutes <= endOfDayMinutes) {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;

      const endMinutesTotal = currentMinutes + durationMinutes;
      const endHour = Math.floor(endMinutesTotal / 60);
      const endMin = endMinutesTotal % 60;

      const slotStart = new Date(year, month - 1, day, startHour, startMin, 0);
      const slotEnd = new Date(year, month - 1, day, endHour, endMin, 0);

      // Check collision with existing doctor appointments
      const hasCollision = existingSchedule.some((booked) => {
        if (['cancelled', 'no-show'].includes(booked.status)) return false;
        const bStart = new Date(booked.startTime).getTime();
        const bEnd = new Date(booked.endTime).getTime();
        return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
      });

      const label = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(
        2,
        '0'
      )} - ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      slots.push({
        label,
        startTime: slotStart,
        endTime: slotEnd,
        isOccupied: hasCollision,
      });

      currentMinutes += durationMinutes;
    }

    return slots;
  };

  const candidateSlots = generateSlots();
  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  // 4. Handle booking submission
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedDoctorId) return;

    setIsBooking(true);
    setBookingError(null);

    try {
      const payload = {
        doctorId: selectedDoctorId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes,
        triage: {
          rawSymptoms: triageContext?.rawSymptoms || '',
          urgencyLevel: triageContext?.urgencyLevel || 'routine',
          aiSummary: triageContext?.aiSummary || '',
          recommendedSpecialty: triageContext?.recommendedSpecialty || '',
        },
      };

      const res = await appointmentApi.createAppointment(payload);
      if (res.data) {
        onBookingSuccess(res.data);
      }
    } catch (err) {
      setBookingError(
        err.response?.data?.message || err.message || 'Failed to book appointment'
      );
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Card className="border-cyan-200/80 shadow-md">
      <CardHeader className="bg-cyan-50/60">
        <div>
          <CardTitle className="flex items-center gap-2 text-cyan-900">
            <CalendarIcon className="w-5 h-5 text-cyan-600" />
            Dynamic Consultation Slot Booking
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Slot duration automatically calibrated to <strong>{durationMinutes} minutes</strong>{' '}
            based on AI symptom assessment.
          </p>
        </div>
        {triageContext?.urgencyLevel && (
          <Badge
            variant={
              triageContext.urgencyLevel === 'emergency'
                ? 'danger'
                : triageContext.urgencyLevel === 'urgent'
                ? 'warning'
                : 'success'
            }
            dot
          >
            {triageContext.urgencyLevel}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Doctor and Date Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Physician
            </label>
            {isLoadingDoctors ? (
              <div className="text-xs text-slate-400 py-2">Loading physicians...</div>
            ) : doctors.length === 0 ? (
              <div className="text-xs text-rose-500 py-2">No registered doctors found.</div>
            ) : (
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 cursor-pointer"
              >
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.name} — {d.doctorProfile?.specialty || 'General Physician'} (
                    {d.doctorProfile?.department || 'Outpatient'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Appointment Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Available Slot Chips Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Available Slots ({selectedDate})
            </span>
            <span className="text-[11px] text-slate-400">
              {durationMinutes}-min windows • Collision Checked
            </span>
          </div>

          {isLoadingSlots ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Checking doctor calendar and room availability...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {candidateSlots.map((slot, index) => {
                const isSelected =
                  selectedSlot && selectedSlot.startTime.getTime() === slot.startTime.getTime();

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={slot.isOccupied}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                      slot.isOccupied
                        ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                        : isSelected
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-600/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50'
                    }`}
                  >
                    {slot.label.split(' - ')[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Summary Pill */}
        {selectedSlot && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Selected: <strong>{selectedSlot.label}</strong> with{' '}
                <strong>Dr. {selectedDoctor?.name}</strong>
              </span>
            </div>
            <Badge variant="success" size="sm">
              Slot Reserved
            </Badge>
          </div>
        )}

        {bookingError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{bookingError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmBooking}
            disabled={!selectedSlot}
            isLoading={isBooking}
          >
            Confirm & Book Appointment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicSlotPicker;
