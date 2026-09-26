import React from 'react';
import {
  User,
  Heart,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
  Stethoscope,
  Activity,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { maskPolicyNumber } from '../../utils/maskData.js';

export const PatientBriefingCard = ({ appointment }) => {
  if (!appointment) {
    return (
      <Card className="p-8 text-center text-slate-400 text-xs">
        Select a patient from the queue to view clinical briefing.
      </Card>
    );
  }

  const patient = appointment.patientId || {};
  const profile = patient.patientProfile || {};
  const triage = appointment.triage || {};

  return (
    <Card className="border-purple-200/80 shadow-md">
      <CardHeader className="bg-purple-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {patient.name ? patient.name.slice(0, 2).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div>
            <CardTitle className="text-purple-950">{patient.name || 'Patient'}</CardTitle>
            <span className="text-[11px] text-slate-500">
              {profile.gender ? profile.gender.toUpperCase() : 'N/A'} • Blood Group:{' '}
              <strong>{profile.bloodGroup || 'Unspecified'}</strong>
            </span>
          </div>
        </div>

        <Badge
          variant={
            triage.urgencyLevel === 'emergency'
              ? 'danger'
              : triage.urgencyLevel === 'urgent'
              ? 'warning'
              : 'primary'
          }
          size="md"
          dot
        >
          {triage.urgencyLevel || 'routine'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Pre-Consultation Triage Insight */}
        <div className="p-4 bg-linear-to-r from-purple-50 to-indigo-50/50 rounded-xl border border-purple-100 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>AI Clinical Pre-Consultation Intake</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {triage.aiSummary || triage.rawSymptoms || 'No initial symptom report provided.'}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
            <span>
              Target Specialty: <strong>{triage.recommendedSpecialty || 'General'}</strong>
            </span>
            <span>•</span>
            <span>
              Scheduled Window: <strong>{appointment.durationMinutes} mins</strong>
            </span>
          </div>
        </div>

        {/* Clinical Vitals & Risk Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              No-Show Risk
            </span>
            <span
              className={`text-sm font-bold ${
                (appointment.noShowProbability || 0) > 0.3
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}
            >
              {Math.round((appointment.noShowProbability || 0.05) * 100)}%
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Appointment Status
            </span>
            <span className="text-xs font-bold text-slate-800 capitalize">
              {appointment.status}
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Insurance Status
            </span>
            <span className="text-xs font-bold text-slate-800 block truncate">
              {profile.insurance?.provider || 'Self Pay'}
            </span>
            {profile.insurance?.policyNumber && (
              <span className="text-[10px] text-slate-500 font-mono block">
                {maskPolicyNumber(profile.insurance.policyNumber)}
              </span>
            )}
          </div>
        </div>

        {/* Known Allergies & Chronic Conditions */}
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Documented Allergies
            </span>
            {profile.allergies && profile.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {profile.allergies.map((allergy, i) => (
                  <Badge key={i} variant="danger" size="sm">
                    {allergy}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">No documented drug allergies.</span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Chronic Conditions
            </span>
            {profile.chronicConditions && profile.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {profile.chronicConditions.map((condition, i) => (
                  <Badge key={i} variant="default" size="sm">
                    {condition}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">No known chronic conditions.</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientBriefingCard;
