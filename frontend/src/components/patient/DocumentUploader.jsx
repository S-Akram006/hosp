import React, { useState, useRef } from 'react';
import { aiApi } from '../../api/aiApi.js';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import { maskPolicyNumber } from '../../utils/maskData.js';

export const DocumentUploader = ({ onSaveSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WebP)');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setOcrResult(null);
    setIsSaved(false);

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleProcessOcr = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const res = await aiApi.ocrIntakeDocument(selectedFile);
      if (res.data) {
        setOcrResult(res.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'OCR document processing failed'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    setIsSaved(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmSave = () => {
    setIsSaved(true);
    if (onSaveSuccess) {
      onSaveSuccess(ocrResult.structuredData);
    }
  };

  return (
    <Card className="border-teal-200/80 shadow-md">
      <CardHeader className="bg-teal-50/60">
        <div>
          <CardTitle className="flex items-center gap-2 text-teal-900">
            <FileText className="w-5 h-5 text-teal-600" />
            Automated Pre-Visit Intake OCR
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Upload your insurance card or prescription. Tesseract OCR and LLM automatically
            extract and structure your information.
          </p>
        </div>
        <Badge variant="success" size="sm">
          HIPAA Secure
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        {!selectedFile ? (
          /* Dropzone */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/20 rounded-2xl p-8 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">
              Click to upload or drag & drop intake document
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Supports Health Insurance Cards, Doctor Prescriptions (PNG, JPEG, WebP up to 10MB)
            </p>
          </div>
        ) : (
          /* Preview and OCR Processing Area */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Uploaded preview"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                  />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Image Document
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleReset} type="button">
                  Remove
                </Button>
                {!ocrResult && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleProcessOcr}
                    isLoading={isUploading}
                    icon={UploadCloud}
                  >
                    Extract OCR Data
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Extracted Structured Results */}
            {ocrResult && (
              <div className="p-5 bg-white rounded-xl border border-teal-200 space-y-4 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    <span className="text-sm font-bold text-slate-900">
                      OCR Extraction Successful
                    </span>
                  </div>
                  <Badge variant="primary" size="sm" className="capitalize">
                    {ocrResult.structuredData?.documentType?.replace('_', ' ') || 'Document'}
                  </Badge>
                </div>

                {/* Insurance Fields */}
                {ocrResult.structuredData?.insurance && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-teal-50/40 rounded-xl border border-teal-100/60 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Identified Provider
                      </span>
                      <span className="font-semibold text-slate-800">
                        {ocrResult.structuredData.insurance.provider || 'Not detected'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Policy / Member ID
                      </span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {maskPolicyNumber(ocrResult.structuredData.insurance.policyNumber)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Prescriptions detected */}
                {ocrResult.structuredData?.prescriptions &&
                  ocrResult.structuredData.prescriptions.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">
                        Detected Prescriptions:
                      </span>
                      <div className="space-y-1">
                        {ocrResult.structuredData.prescriptions.map((p, i) => (
                          <div key={i} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                            <span className="font-medium text-slate-800">{p.medication}</span>
                            <span className="text-slate-500">
                              {p.dosage} • {p.frequency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Raw OCR snippet */}
                {ocrResult.rawOcrText && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Raw OCR Output
                    </span>
                    <pre className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono">
                      {ocrResult.rawOcrText}
                    </pre>
                  </div>
                )}

                {/* Save confirmation */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Verify extracted fields before confirming
                  </span>
                  {isSaved ? (
                    <Badge variant="success" size="md">
                      ✓ Profile Saved
                    </Badge>
                  ) : (
                    <Button variant="success" size="md" onClick={handleConfirmSave} icon={ShieldCheck}>
                      Confirm & Save to Profile
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUploader;
