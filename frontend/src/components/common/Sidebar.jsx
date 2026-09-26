import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  HeartPulse,
  LayoutDashboard,
  Calendar,
  Sparkles,
  FileText,
  Clock,
  AlertOctagon,
  Layers,
  Users,
  Tv,
  Stethoscope,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuthStore();

  const patientNav = [
    { name: 'Dashboard', to: '/patient', icon: LayoutDashboard },
    { name: 'My Appointments', to: '/patient/appointments', icon: Calendar },
    { name: 'AI Symptom Triage', to: '/patient/triage', icon: Sparkles },
    { name: 'Intake OCR Upload', to: '/patient/intake-ocr', icon: FileText },
  ];

  const doctorNav = [
    { name: 'Overview', to: '/doctor', icon: LayoutDashboard },
    { name: 'Schedule', to: '/doctor/schedule', icon: Calendar },
    { name: 'Live Patient Queue', to: '/doctor/queue', icon: Clock },
    { name: 'Ambient AI Scribe', to: '/doctor/scribe', icon: Sparkles },
    { name: 'Emergency Override', to: '/doctor/emergency', icon: AlertOctagon },
  ];

  const adminNav = [
    { name: 'Operations Overview', to: '/admin', icon: LayoutDashboard },
    { name: 'Hospital Resources', to: '/admin/resources', icon: Layers },
    { name: 'Live Waiting Monitor', to: '/admin/live-queue', icon: Tv },
    { name: 'Clinical Emergency', to: '/admin/emergency', icon: AlertOctagon },
  ];

  const navItems =
    role === 'patient' ? patientNav : role === 'doctor' ? doctorNav : adminNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-slate-900 text-white z-50 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight block">
                MediAI <span className="text-cyan-400">Pulse</span>
              </span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-medium">
                Hospital Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-6 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {role ? `${role} Portal` : 'Navigation'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/${role}`}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Live System Status Widget at bottom of sidebar */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-[11px]">
              <span className="text-slate-200 font-medium block">Hospital System Active</span>
              <span className="text-slate-400 text-[10px]">Real-time events connected</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
