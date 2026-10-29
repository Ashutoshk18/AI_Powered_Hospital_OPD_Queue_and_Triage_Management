import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
  Users,
  Calendar,
  Clock,
  Activity,
  CheckCircle,
  Database,
  Cpu,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [sumRes, logsRes] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAuditLogs(),
      ]);
      setSummary(sumRes.summary);
      setLogs(logsRes.logs);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading operational telemetry...</span>
      </div>
    );
  }

  const tierColors = ['#dc2626', '#f97316', '#fbbf24', '#38bdf8', '#94a3b8'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hospital Administrative Control & Telemetry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time outpatient departmental metrics, ML inference telemetry, and audit trail
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
            System Healthy
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Registered Patients</span>
            <Users className="w-5 h-5 text-hospital-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary?.totalPatients || 0}</p>
          <span className="text-[11px] text-slate-500">Active electronic profiles</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Appointments</span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary?.totalAppointments || 0}</p>
          <span className="text-[11px] text-slate-500">Scheduled / checked-in</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Waiting in Queue</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary?.activeQueueCount || 0}</p>
          <span className="text-[11px] text-slate-500">Across all departments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Avg Wait Time</span>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary?.avgWaitMinutes || 0}m</p>
          <span className="text-[11px] text-slate-500">Check-in to consult</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Completed Today</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary?.completedToday || 0}</p>
          <span className="text-[11px] text-slate-500">Consultations closed</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Load */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>Department Patient Load</span>
            <span className="text-xs font-normal text-slate-500">Active consultations + waiting</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.departmentStats || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="activePatients" fill="#0284c7" radius={[4, 4, 0, 0]} name="Active Patients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Triage Urgency Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>Triage Urgency Tier Distribution</span>
            <span className="text-xs font-normal text-slate-500">Current Queue Entries</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.tierDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Patients">
                  {(summary?.tierDistribution || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={tierColors[index % tierColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Engine Health & Policy Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm flex items-start space-x-3">
          <Database className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold">Relational Persistence</h4>
            <p className="text-xs text-slate-300 mt-1">Prisma ORM | SQLite / PostgreSQL</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-1">ACID Transaction Pool Active</p>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm flex items-start space-x-3">
          <Cpu className="w-6 h-6 text-sky-400 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold">ML Inference Microservice</h4>
            <p className="text-xs text-slate-300 mt-1">RandomForestRegressor v1.2.0-rf</p>
            <p className="text-[11px] text-sky-400 font-mono mt-1">3000ms Fallback Guard Enabled</p>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm flex items-start space-x-3">
          <ShieldAlert className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold">Dynamic Aging Policy</h4>
            <p className="text-xs text-slate-300 mt-1">Linear Aging Coefficient α = 1.0</p>
            <p className="text-[11px] text-amber-400 font-mono mt-1">Starvation Ceiling &lt; 120 mins</p>
          </div>
        </div>
      </div>

      {/* Real-time Audit Logs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Security & Clinical Audit Trail</h3>
            <p className="text-xs text-slate-500">Immutable ledger of queue actions, triage overrides, and authorizations</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Last 50 events</span>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Timestamp</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Actor</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Action</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Target Entity</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Payload / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {log.user ? `${log.user.fullName} (${log.user.role})` : 'System / Anonymous'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 font-mono">
                      {log.entityType}:{log.entityId?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-slate-500 truncate max-w-xs font-mono text-[11px]">
                      {log.metadata || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
