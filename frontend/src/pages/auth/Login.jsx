import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const sessionExpired = new URLSearchParams(location.search).get('session_expired');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const result = await login(email, password);
    if (result.success) {
      const role = result.user.role;
      const target =
        role === 'patient' ? '/patient' : role === 'doctor' ? '/doctor' : '/admin';
      navigate(target, { replace: true });
    }
  };

  // Quick fill helper for testing & development
  const handleQuickFill = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Welcome to Hospital Portal
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Sign in to access your appointments, schedules, and clinical AI tools
        </p>
      </div>

      {sessionExpired && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Your session has expired. Please log in again.</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="doctor@hospital.com or patient@example.com"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="Enter your password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          Sign In to Portal
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      {/* Quick Role Fill Buttons */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center mb-2.5">
          Quick Demo Accounts
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('patient@example.com', 'password123')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-cyan-500 hover:text-cyan-700 text-xs font-medium transition-colors cursor-pointer bg-slate-50/50"
          >
            Patient
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('doctor@hospital.com', 'password123')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-purple-500 hover:text-purple-700 text-xs font-medium transition-colors cursor-pointer bg-slate-50/50"
          >
            Doctor
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('admin@hospital.com', 'password123')}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-rose-500 hover:text-rose-700 text-xs font-medium transition-colors cursor-pointer bg-slate-50/50"
          >
            Admin
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Don't have an account yet?{' '}
        <Link to="/register" className="font-semibold text-cyan-600 hover:text-cyan-700 underline">
          Create new account
        </Link>
      </div>
    </div>
  );
};

export default Login;
