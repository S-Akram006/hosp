import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api/aiApi.js';
import {
  FileCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Pill,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

export const SoapNoteEditor = ({ appointmentId, initialSoapNote, onSignedSuccess }) => {
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  const [prescriptions, setPrescriptions] = useState([]);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState(null);
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    if (initialSoapNote) {
      setSoapData({
        subjective: initialSoapNote.subjective || '',
        objective: initialSoapNote.objective || '',
        assessment: initialSoapNote.assessment || '',
        plan: initialSoapNote.plan || '',
      });
      if (
        initialSoapNote.extractedPrescriptions &&
        Array.isArray(initialSoapNote.extractedPrescriptions)
      ) {
        setPrescriptions(initialSoapNote.extractedPrescriptions);
      }
      setIsSigned(false);
    }
  }, [initialSoapNote]);

  const handleSoapChange = (field, value) => {
    setSoapData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPrescription = () => {
    setPrescriptions((prev) => [
      ...prev,
      { medication: '', dosage: '', frequency: 'Daily', durationDays: 7 },
    ]);
  };

  const handlePrescriptionChange = (index, field, value) => {
    setPrescriptions((prev) => {
      const copy = [...prev];
      copy[index][field] = field === 'durationDays' ? Number(value) : value;
      return copy;
    });
  };

  const handleRemovePrescription = (index) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSignAndApprove = async () => {
    if (!appointmentId) {
      setError('Please select an active consultation to sign records for');
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      const res = await aiApi.signMedicalRecord(appointmentId, {
        soapNote: soapData,
        prescriptions,
      });

      setIsSigned(true);
      if (onSignedSuccess) {
        onSignedSuccess(res.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to sign and complete record'
      );
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Card className="border-teal-200/80 shadow-md">
      <CardHeader className="bg-teal-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-teal-600" />
          <CardTitle className="text-teal-950">Clinical SOAP Documentation</CardTitle>
        </div>
        <Badge variant={isSigned ? 'success' : 'primary'} size="sm">
          {isSigned ? 'Digitally Signed & Completed' : 'Draft Mode'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 4-Box SOAP Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 text-[11px] font-black inline-flex items-center justify-center">
                S
              </span>
              Subjective (Chief Complaint & History)
            </label>
            <textarea
              rows={3}
              value={soapData.subjective}
              onChange={(e) => handleSoapChange('subjective', e.target.value)}
              placeholder="Patient reports symptoms, timeline, chief complaint..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black inline-flex items-center justify-center">
                O
              </span>
              Objective (Vitals & Physical Exam)
            </label>
            <textarea
              rows={3}
              value={soapData.objective}
              onChange={(e) => handleSoapChange('objective', e.target.value)}
              placeholder="Observed signs, blood pressure, diagnostic exam findings..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black inline-flex items-center justify-center">
                A
              </span>
              Assessment (Clinical Reasoning & Diagnosis)
            </label>
            <textarea
              rows={3}
              value={soapData.assessment}
              onChange={(e) => handleSoapChange('assessment', e.target.value)}
              placeholder="Primary diagnosis, differential reasoning..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-black inline-flex items-center justify-center">
                P
              </span>
              Plan (Treatment, Lifestyle & Follow-Up)
            </label>
            <textarea
              rows={3}
              value={soapData.plan}
              onChange={(e) => handleSoapChange('plan', e.target.value)}
              placeholder="Prescriptions, ordered imaging/labs, follow-up..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Dynamic Prescription Table */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Extracted & Prescribed Pharmacotherapy
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleAddPrescription}
              type="button"
            >
              Add Medication
            </Button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
              No prescriptions added yet. Click 'Add Medication' to prescribe drugs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Medication Name</th>
                    <th className="p-2.5">Dosage</th>
                    <th className="p-2.5">Frequency</th>
                    <th className="p-2.5">Duration (Days)</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptions.map((rx, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={rx.medication}
                          placeholder="e.g. Amoxicillin"
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'medication', e.target.value)
                          }
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={rx.dosage}
                          placeholder="e.g. 500mg"
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'dosage', e.target.value)
                          }
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={rx.frequency}
                          placeholder="e.g. Twice daily"
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'frequency', e.target.value)
                          }
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2 w-28">
                        <input
                          type="number"
                          value={rx.durationDays}
                          min={1}
                          max={365}
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'durationDays', e.target.value)
                          }
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemovePrescription(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Digitally signs record & marks appointment as Completed
          </span>
          <Button
            variant="success"
            size="lg"
            icon={FileSignature}
            onClick={handleSignAndApprove}
            isLoading={isSigning}
            disabled={!soapData.subjective || isSigned}
          >
            {isSigned ? '✓ Record Finalized & Signed' : 'Sign & Complete Consultation'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SoapNoteEditor;
