import React, { useState } from 'react';
import { queueApi } from '../../api/queueApi.js';
import { AlertOctagon, Clock, ShieldAlert } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

export const EmergencyOverrideModal = ({ isOpen, onClose, doctorId, onSuccess }) => {
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [reason, setReason] = useState('Critical trauma emergency intervention');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const quickReasons = [
    'Critical trauma code blue resuscitation',
    'Emergency cardiac catheterization',
    'Acute stroke thrombolysis protocol',
    'Emergency cesarean delivery',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await queueApi.triggerEmergencyOverride({
        doctorId,
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
