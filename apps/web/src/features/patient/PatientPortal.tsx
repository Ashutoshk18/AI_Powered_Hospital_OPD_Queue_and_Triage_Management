import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { TriageBadge } from '../../components/TriageBadge';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Clock,
  User,
  Calendar,
  Activity,
  AlertTriangle,
  RefreshCw,
  Hash,
  Stethoscope,
} from 'lucide-react';

// Local types (api/client uses `any` for now)
interface AppointmentItem {
  id: string;
  scheduledAt: string;
  status: string;
  chiefComplaint?: string;
  doctor?: {
    user?: { name?: string };
    department?: { name?: string };
  };
}

interface ActiveToken {
  id: string;
  tokenNumber: number;
  triageTier: number;
  status: string;
  checkedInAt: string;
  estimatedWaitMinutes?: number;
  positionAhead?: number;
  source?: string;
  appointment?: {
    doctor?: {
      user?: { name?: string };
      department?: { name?: string };
    };
  };
}

export default function PatientPortal() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [activeToken, setActiveToken] = useState<ActiveToken | null>(null);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [loadingToken, setLoadingToken] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [apptData, tokenData] = await Promise.allSettled([
        api.getAppointments(),
        api.getMyTokenStatus(),
      ]);

      if (apptData.status === 'fulfilled') {
        setAppointments((apptData.value as unknown as { appointments: AppointmentItem[] }).appointments ?? []);
      }
      if (tokenData.status === 'fulfilled') {
        const res = tokenData.value as unknown as { activeToken: ActiveToken | null };
        setActiveToken(res.activeToken ?? null);
      } else {
        setActiveToken(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setError(msg);
    } finally {
      setLoadingAppts(false);
      setLoadingToken(false);
      setLastRefreshed(new Date());
    }
  }, []);

  // Initial load + polling every 15 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatDateTime = (dt: string) =>
    new Date(dt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatTime = (dt: string) =>
    new Date(dt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
          <p className="text-sm text-gray-500">
            Welcome, {user?.fullName} &mdash; Your OPD Queue Dashboard
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 btn-secondary text-sm"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Last updated: {formatTime(lastRefreshed.toISOString())} &mdash; Auto-refreshes every 15 s
      </p>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Active Token Card */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Active Queue Token
        </h2>

        {loadingToken ? (
          <div className="card animate-pulse h-32" />
        ) : activeToken ? (
          <div className="card border-l-4 border-l-blue-500">
            <div className="flex flex-wrap gap-4 items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-xl p-3">
                    <Hash className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Token</p>
                    <p className="text-4xl font-bold text-blue-700">
                      {activeToken.tokenNumber}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-4 h-4" />
                    {activeToken.appointment?.doctor?.department?.name ?? '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Dr. {activeToken.appointment?.doctor?.user?.name ?? '—'}
                  </span>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <TriageBadge tier={activeToken.triageTier} showDetails />
                  <StatusBadge status={activeToken.status} />
                </div>
              </div>

              <div className="flex flex-col gap-4 text-center">
                {activeToken.positionAhead !== undefined && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-2xl font-bold text-amber-700">
                      {activeToken.positionAhead}
                    </p>
                    <p className="text-xs text-amber-600">patients ahead</p>
                  </div>
                )}
                {activeToken.estimatedWaitMinutes !== undefined && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-700 flex items-center gap-1 justify-center">
                      <Clock className="w-5 h-5" />
                      {activeToken.estimatedWaitMinutes}
                    </p>
                    <p className="text-xs text-green-600">est. wait (min)</p>
                    {activeToken.source && (
                      <p className="text-xs text-gray-400 mt-1">
                        {activeToken.source === 'ML_MODEL' ? 'AI model' : 'Rule-based'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {activeToken.triageTier === 1 && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <strong>Emergency:</strong>&nbsp;You have been flagged for immediate attention.
                Please go directly to the emergency desk &mdash; do not wait in queue.
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
              <strong>Note:</strong> Waiting time estimates are for operational scheduling only and
              are not medical advice. Actual times may vary based on clinical needs.
            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No active queue token</p>
            <p className="text-sm text-gray-400 mt-1">
              Visit the reception desk to check in for your appointment.
            </p>
          </div>
        )}
      </section>

      {/* Appointment History */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          My Appointments
        </h2>

        {loadingAppts ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse h-16" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="card text-center py-10">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments found</p>
            <p className="text-sm text-gray-400 mt-1">
              Contact the reception desk to book an appointment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="card flex flex-wrap gap-4 items-center justify-between py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 rounded-lg p-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {appt.doctor ? `Dr. ${appt.doctor.user?.name ?? '—'}` : '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {appt.doctor?.department?.name ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="font-medium">{formatDateTime(appt.scheduledAt)}</p>
                  {appt.chiefComplaint && (
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">
                      {appt.chiefComplaint}
                    </p>
                  )}
                </div>

                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <div className="text-xs text-gray-400 border-t pt-4">
        <strong>Disclaimer:</strong> This system is for operational queue management only. Triage
        prioritization is not a medical diagnosis. Always follow your healthcare provider&apos;s
        instructions.
      </div>
    </div>
  );
}
