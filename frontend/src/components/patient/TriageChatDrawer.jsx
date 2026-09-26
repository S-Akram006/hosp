import React, { useState } from 'react';
import { aiApi } from '../../api/aiApi.js';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  Stethoscope,
  Send,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

export const TriageChatDrawer = ({ isOpen, onClose, onProceedToBooking }) => {
  const [symptoms, setSymptoms] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [error, setError] = useState(null);

  const sampleSymptoms = [
    'Sharp chest pain radiating to left shoulder and feeling breathless',
    'Persistent dry cough, mild fever 100°F and fatigue for 3 days',
    'Severe throbbing migraine with visual spots and sensitivity to light',
    'Red itchy skin rash on forearm with small blisters for 4 days',
  ];

  const handleTriageSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!symptoms.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await aiApi.triageSymptoms({
        symptoms: symptoms.trim(),
      });
      if (res.data) {
        setTriageResult(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Triage failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTriageResult(null);
    setSymptoms('');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Clinical Intake & Symptom Triage"
      description="Powered by clinical intelligence to evaluate urgency, recommended specialty, and appointment duration."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {!triageResult ? (
          <form onSubmit={handleTriageSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Describe your symptoms in your own words
              </label>
              <textarea
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Example: I have had a severe throbbing headache for the past 2 days with blurry vision..."
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 p-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 transition-colors"
                required
              />
            </div>

            {/* Quick sample chips */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Or try a clinical example:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sampleSymptoms.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSymptoms(sample)}
                    className="text-[11px] text-left px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-cyan-50 hover:border-cyan-300 text-slate-700 transition-colors cursor-pointer"
                  >
                    "{sample.slice(0, 48)}..."
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isLoading}
                icon={Sparkles}
              >
                Analyze Symptoms
              </Button>
            </div>
          </form>
        ) : (
          /* Triage Output Screen */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Red Flag Emergency Warning Banner */}
            {triageResult.redFlagWarning && (
              <div className="p-4 bg-rose-600 text-white rounded-xl shadow-md flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <h4 className="font-bold text-sm">Critical Clinical Red Flag Alert</h4>
                  <p className="text-xs text-rose-100 mt-1 leading-relaxed">
                    Symptoms suggest potential emergency risk. If you are experiencing acute chest
                    pain or severe breathing difficulties, please call emergency services (911)
                    immediately.
                  </p>
                </div>
              </div>
            )}

            {/* Assessment Summary Card */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Urgency Priority:
                  </span>
                  <Badge
                    size="md"
                    variant={
                      triageResult.urgencyLevel === 'emergency'
                        ? 'danger'
                        : triageResult.urgencyLevel === 'urgent'
                        ? 'warning'
                        : 'success'
                    }
                    dot
                  >
                    {triageResult.urgencyLevel.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-cyan-600" />
                  <span>
                    Estimated Slot Duration:{' '}
                    <strong>{triageResult.estimatedDurationMinutes} mins</strong>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Recommended Specialty
                </span>
                <div className="flex items-center gap-2 text-cyan-800 font-bold text-base">
                  <Stethoscope className="w-5 h-5 text-cyan-600" />
                  <span>{triageResult.recommendedSpecialty}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Clinical Intake Summary
                </span>
                <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {triageResult.aiSummary}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Assess Different Symptoms
              </Button>
              <Button
                variant="primary"
                icon={ArrowRight}
                onClick={() => {
                  onProceedToBooking({
                    ...triageResult,
                    rawSymptoms: symptoms,
                  });
                  onClose();
                }}
              >
                Proceed to Book {triageResult.recommendedSpecialty} Slot
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TriageChatDrawer;
