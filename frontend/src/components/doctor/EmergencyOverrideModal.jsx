import React, { useState, useEffect } from 'react';
import { queueApi } from '../../api/queueApi.js';
import { authApi } from '../../api/authApi.js';
import { AlertOctagon, ShieldAlert } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

export const EmergencyOverrideModal = ({ isOpen, onClose, doctorId, onSuccess }) => {
  const [selectedDocId, setSelectedDocId] = useState(doctorId || '');
  const [doctorsList, setDoctorsList] = useState([]);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [reason, setReason] = useState('Critical trauma emergency intervention');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (doctorId) {
      setSelectedDocId(doctorId);
    } else if (isOpen) {
      // If admin opened modal without preset doctorId, fetch doctors
      authApi.getDoctors().then((res) => {
        if (res.data && res.data.length > 0) {
          setDoctorsList(res.data);
          setSelectedDocId((prev) => prev || res.data[0]._id);
        }
      }).catch(console.warn);
    }
  }, [doctorId, isOpen]);

  const quickReasons = [
    'Critical trauma code blue resuscitation',
    'Emergency cardiac catheterization',
    'Acute stroke thrombolysis protocol',
    'Emergency cesarean delivery',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetDocId = doctorId || selectedDocId;
    if (!targetDocId) {
      setError('Please select a physician to apply the emergency override to.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await queueApi.triggerEmergencyOverride({
        doctorId: targetDocId,
        delayMinutes: Number(delayMinutes),
        reason,
      });

      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Emergency override trigger failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinical Emergency Schedule Override"
      description="Immediately shifts upcoming patient appointment times and broadcasts live delay alerts to waiting rooms and patient mobile notifications."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>
            Executing this override will automatically adjust remaining daily consultation
            ETAs and alert checked-in patients.
          </span>
        </div>

        {!doctorId && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Physician On-Duty
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 cursor-pointer"
              required
            >
              {doctorsList.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.name} — {d.doctorProfile?.specialty || 'General'} ({d.doctorProfile?.department || 'Outpatient'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Shift Schedule Forward By (Minutes)
          </label>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDelayMinutes(mins)}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  delayMinutes === mins
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                +{mins}m
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Custom Minutes"
          type="number"
          min="5"
          max="240"
          value={delayMinutes}
          onChange={(e) => setDelayMinutes(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Reason / Clinical Justification
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for schedule shift..."
            required
          />

          <div className="flex flex-wrap gap-1 mt-2">
            {quickReasons.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setReason(r)}
                className="text-[10px] px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" isLoading={isLoading} icon={AlertOctagon}>
            Broadcast Override & Shift Queue
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmergencyOverrideModal;
