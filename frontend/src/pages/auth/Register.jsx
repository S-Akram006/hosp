import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import { User, Mail, Phone, Lock, AlertCircle, ArrowRight, Stethoscope } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'patient',
    specialty: '',
    department: '',
    gender: 'male',
    bloodGroup: 'O+',
  });

  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === 'doctor') {
      payload.doctorProfile = {
        specialty: formData.specialty || 'General Medicine',
        department: formData.department || 'Outpatient Clinic',
      };
    } else if (formData.role === 'patient') {
      payload.patientProfile = {
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
      };
    }

    const result = await register(payload);
    if (result.success) {
      const target =
        formData.role === 'patient' ? '/patient' : formData.role === 'doctor' ? '/doctor' : '/admin';
      navigate(target, { replace: true });
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create an Account</h2>
        <p className="text-xs text-slate-500 mt-1">
          Join MediAI Pulse for real-time appointments and clinical coordination
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Full Name"
          name="name"
          placeholder="e.g. Dr. Sarah Jenkins or John Doe"
          icon={User}
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="name@example.com"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          name="phone"
          placeholder="+1-555-0199"
          icon={Phone}
          value={formData.phone}
          onChange={handleChange}
          required
        />

        <Input
          label="Password (min 6 chars)"
          type="password"
          name="password"
          placeholder="Create a strong password"
          icon={Lock}
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Account Role
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['patient', 'doctor', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, role: r }))}
                className={`py-2 text-xs font-medium rounded-lg border capitalize transition-all cursor-pointer ${
                  formData.role === r
                    ? 'border-cyan-600 bg-cyan-50/70 text-cyan-800 font-semibold ring-1 ring-cyan-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor specific fields */}
        {formData.role === 'doctor' && (
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3 mt-2">
            <span className="text-[11px] font-semibold text-purple-900 block">
              Doctor Specialization
            </span>
            <Input
              label="Medical Specialty"
              name="specialty"
              placeholder="e.g. Cardiology, Neurology"
              value={formData.specialty}
              onChange={handleChange}
            />
            <Input
              label="Department"
              name="department"
              placeholder="e.g. Cardiovascular Care"
              value={formData.department}
              onChange={handleChange}
            />
          </div>
        )}

        {/* Patient specific fields */}
        {formData.role === 'patient' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-cyan-50/40 rounded-xl border border-cyan-100/60 mt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Blood Group
              </label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-4"
          isLoading={isLoading}
        >
          Complete Registration
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-cyan-600 hover:text-cyan-700 underline">
          Sign in to your account
        </Link>
      </div>
    </div>
  );
};

export default Register;
