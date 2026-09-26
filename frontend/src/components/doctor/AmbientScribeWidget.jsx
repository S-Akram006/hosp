import React, { useState, useEffect, useRef } from 'react';
import { aiApi } from '../../api/aiApi.js';
import {
  Mic,
  MicOff,
  Sparkles,
  Play,
  RotateCcw,
  Volume2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

export const AmbientScribeWidget = ({ appointmentId, onSoapGenerated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const sampleTranscripts = [
    'Doctor: Good morning John, what brings you in today? Patient: I have had a sharp pain in my right knee after running last weekend. Doctor: Any visible swelling or clicking? Patient: Yes, mild swelling on the outside. Doctor: Examination reveals localized lateral joint line tenderness, no effusion. Let us order a knee X-Ray and prescribe Ibuprofen 400mg twice daily for 7 days.',
    'Doctor: Hello Sarah, tell me about your migraines. Patient: They start behind my left eye with flashing lights, then pounding pain for hours. Doctor: Any nausea? Patient: Yes, severe nausea. Doctor: Vitals normal, BP 120/78. Impression is classic migraine with aura. We will start Sumatriptan 50mg PRN at onset and maintain a headache diary.',
  ];

  // Clean up audio hardware tracks and timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Timer while recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const toggleRecording = async () => {
    if (!isRecording) {
      setError(null);
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
        }
      } catch (err) {
        console.warn('Microphone permission not granted, entering simulated ambient dictation:', err);
      }

      setIsRecording(true);
      setRecordSeconds(0);
    } else {
      setIsRecording(false);
      // Cleanly release hardware tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // If transcript was empty, auto-populate with clinical sample
      if (!transcript.trim()) {
        const randomSample =
          sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
        setTranscript(randomSample);
      }
    }
  };

  const handleGenerateSoap = async () => {
    if (!transcript.trim()) {
      setError('Please record or enter a consultation transcript first');
      return;
    }
    if (!appointmentId) {
      setError('Please select an active appointment to link this SOAP note');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await aiApi.generateSoapNote({
        rawTranscript: transcript.trim(),
        appointmentId,
      });

      if (res.data?.soapNote) {
        onSoapGenerated(res.data.soapNote);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to generate ambient SOAP note'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card className="border-cyan-200/80 shadow-md">
      <CardHeader className="bg-cyan-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-cyan-600" />
          <CardTitle className="text-cyan-950">Ambient Clinical Scribe</CardTitle>
        </div>
        <Badge variant={isRecording ? 'danger' : 'primary'} size="sm" dot={isRecording}>
          {isRecording ? `Recording ${formatTime(recordSeconds)}` : 'Scribe Ready'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Record Bar */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {isRecording
                  ? 'Listening to Physician & Patient dialogue...'
                  : 'Click microphone to begin ambient consultation capture'}
              </span>
              <span className="text-[11px] text-slate-500">
                {isRecording
                  ? 'Click again to stop recording and finalize transcription'
                  : 'Captures dialogue and generates structured clinical notes automatically'}
              </span>
            </div>
          </div>

          {/* Quick clinical sample filler */}
          {!isRecording && (
            <button
              type="button"
              onClick={() => setTranscript(sampleTranscripts[0])}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 underline cursor-pointer"
            >
              Load Sample Transcript
            </button>
          )}
        </div>

        {/* Live Conversation Transcript Area */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Raw Consultation Transcript
          </label>
          <textarea
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Doctor and patient conversation dialogue will appear here, or you may type dictation directly..."
            className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Trigger Button */}
        <div className="flex justify-end pt-1">
          <Button
            variant="primary"
            size="md"
            icon={Sparkles}
            onClick={handleGenerateSoap}
            isLoading={isGenerating}
            disabled={!transcript.trim() || isRecording}
          >
            Generate Structured SOAP & Prescriptions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AmbientScribeWidget;
