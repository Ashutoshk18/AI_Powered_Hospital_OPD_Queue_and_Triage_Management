import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, Shield, Stethoscope, UserCheck, Clock } from 'lucide-react';

export const Navbar: React.FC<{ activeTab: string; setActiveTab: (tab: string) => void }> = ({
  activeTab,
  setActiveTab,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-hospital-600 text-white p-2 rounded-lg shadow-sm">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Hospital OPD Queue & Triage
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              AI Clinical Scheduling & Anti-Starvation Management
            </p>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            {/* Role switchers for demonstration */}
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg space-x-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-md flex items-center space-x-1 transition ${
                  activeTab === 'admin'
                    ? 'bg-white text-hospital-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => setActiveTab('receptionist')}
                className={`px-3 py-1.5 rounded-md flex items-center space-x-1 transition ${
                  activeTab === 'receptionist'
                    ? 'bg-white text-hospital-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reception</span>
              </button>
              <button
                onClick={() => setActiveTab('doctor')}
                className={`px-3 py-1.5 rounded-md flex items-center space-x-1 transition ${
                  activeTab === 'doctor'
                    ? 'bg-white text-hospital-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor</span>
              </button>
              <button
                onClick={() => setActiveTab('patient')}
                className={`px-3 py-1.5 rounded-md flex items-center space-x-1 transition ${
                  activeTab === 'patient'
                    ? 'bg-white text-hospital-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Patient Portal</span>
              </button>
            </div>

            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{user.fullName}</p>
                <span className="inline-block text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.2 bg-hospital-100 text-hospital-800 rounded">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
