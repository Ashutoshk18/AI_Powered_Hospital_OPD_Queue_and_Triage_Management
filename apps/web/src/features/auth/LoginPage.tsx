import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Activity, Shield, UserCheck, Stethoscope, Clock, Lock, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@opd.org');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-hospital-600 text-white p-3 rounded-2xl shadow-lg">
            <Activity className="h-10 w-10" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          AI Hospital OPD & Triage Management
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Sign in to access your role-based clinical or patient dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-hospital-600 hover:bg-hospital-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hospital-500 disabled:opacity-50 transition"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Role Fillers */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick Demonstration Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoRole('admin@opd.org')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 flex items-center space-x-2 transition"
              >
                <Shield className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-bold text-slate-800">Admin</p>
                  <p className="text-[10px] text-slate-500">admin@opd.org</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('reception@opd.org')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 flex items-center space-x-2 transition"
              >
                <UserCheck className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-bold text-slate-800">Receptionist</p>
                  <p className="text-[10px] text-slate-500">reception@opd.org</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('dr.sharma@opd.org')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 flex items-center space-x-2 transition"
              >
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-800">Doctor (Cardiology)</p>
                  <p className="text-[10px] text-slate-500">dr.sharma@opd.org</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('patient.john@opd.org')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 flex items-center space-x-2 transition"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-bold text-slate-800">Patient</p>
                  <p className="text-[10px] text-slate-500">patient.john@opd.org</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
