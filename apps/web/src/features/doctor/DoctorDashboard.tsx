import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { TriageBadge } from '../../components/TriageBadge';
import {
  Stethoscope,
  Play,
  CheckCircle,
  Clock,
  Edit3,
  X,
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [queueData, setQueueData] = useState<any>({ inConsultation: [], waitingQueue: [], totalWaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);

  // Consultation completion form
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionSummary, setPrescriptionSummary] = useState('');
  const [submittingNotes, setSubmittingNotes] = useState(false);

  // Override dialog
  const [overrideModalEntry, setOverrideModalEntry] = useState<any | null>(null);
  const [overrideNewTier, setOverrideNewTier] = useState<number>(2);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const loadDepartmentsAndQueue = async () => {
    try {
      const deptRes = await api.getDepartments();
      setDepartments(deptRes.departments);

      // Default to doctor's assigned department if available
      let deptId = selectedDeptId;
      if (!deptId) {
        if (user?.doctor?.departmentId) {
          deptId = user.doctor.departmentId;
        } else if (deptRes.departments.length > 0) {
          deptId = deptRes.departments[0].id;
        }
        setSelectedDeptId(deptId);
      }

      if (deptId) {
        const qRes = await api.getDepartmentQueue(deptId);
        setQueueData(qRes);
      }
    } catch (err) {
      console.error('Failed to load doctor queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartmentsAndQueue();
    const interval = setInterval(() => {
      if (selectedDeptId) {
        api.getDepartmentQueue(selectedDeptId).then(setQueueData).catch(console.error);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedDeptId]);

  const activePatient = queueData.inConsultation.length > 0 ? queueData.inConsultation[0] : null;

  const handleCallNext = async () => {
    if (!user?.doctor?.id) {
      alert('Doctor profile not linked to current user.');
      return;
    }
    setCallingNext(true);
    try {
      await api.callNextPatient(user.doctor.id);
      const qRes = await api.getDepartmentQueue(selectedDeptId);
      setQueueData(qRes);
    } catch (err: any) {
      alert(`Call next failed: ${err.message}`);
    } finally {
      setCallingNext(false);
    }
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    setSubmittingNotes(true);
    try {
      await api.completeConsultation({
        queueEntryId: activePatient.id,
        clinicalNotes,
        diagnosis,
        prescriptionSummary,
      });
      alert('Consultation completed and saved successfully.');
      setClinicalNotes('');
      setDiagnosis('');
      setPrescriptionSummary('');
      const qRes = await api.getDepartmentQueue(selectedDeptId);
      setQueueData(qRes);
    } catch (err: any) {
      alert(`Completion failed: ${err.message}`);
    } finally {
      setSubmittingNotes(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalEntry) return;
    try {
      await api.overrideTriage(overrideModalEntry.id, overrideNewTier, overrideReason);
      alert('Triage priority overridden and audit logged.');
      setOverrideModalEntry(null);
      setOverrideReason('');
      const qRes = await api.getDepartmentQueue(selectedDeptId);
      setQueueData(qRes);
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hospital-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading clinical queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Department Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-hospital-600" />
            <span>Doctor Consultation Console</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic-priority patient sequencing, clinical examination, and triage override authority
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-600">Department:</label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 focus:ring-2 focus:ring-hospital-500 focus:outline-none"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left = Active Patient / Action | Right = Waiting Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Active Patient or Call Next */}
        <div className="lg:col-span-5 space-y-5">
          {activePatient ? (
            <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active Consultation
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    {activePatient.appointment.patient.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    MRN: {activePatient.appointment.patient.medicalRecordNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-hospital-700">
                    {activePatient.tokenDisplay}
                  </span>
                  <div className="mt-1">
                    <TriageBadge tier={activePatient.currentTriageTier} showDetails />
                  </div>
                </div>
              </div>

              {/* Triage Vitals Card */}
              {activePatient.triageAssessment && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                  <h4 className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Intake Vitals & Triage Rationale</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Assessed at: {new Date(activePatient.triageAssessment.assessedAt).toLocaleTimeString()}
                    </span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Blood Pressure:</span>
                      <span className="font-bold text-slate-800">
                        {activePatient.triageAssessment.systolicBP}/{activePatient.triageAssessment.diastolicBP} mmHg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pulse:</span>
                      <span className="font-bold text-slate-800">{activePatient.triageAssessment.heartRate} bpm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SpO2:</span>
                      <span className="font-bold text-slate-800">{activePatient.triageAssessment.oxygenSaturation}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Temperature:</span>
                      <span className="font-bold text-slate-800">{activePatient.triageAssessment.temperatureCelsius}°C</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pain Score:</span>
                      <span className="font-bold text-slate-800">{activePatient.triageAssessment.painScore}/10</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1 italic">
                    "{activePatient.triageAssessment.explanation}"
                  </p>
                </div>
              )}

              {/* Consultation Notes Form */}
              <form onSubmit={handleCompleteConsultation} className="space-y-3 text-xs pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700">Diagnosis (ICD-10)</label>
                  <input
                    type="text"
                    required
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Essential Hypertension (I10)"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700">Clinical Examination & Notes</label>
                  <textarea
                    rows={3}
                    required
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Enter examination findings, symptoms, and clinical advice..."
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700">Prescription Summary</label>
                  <input
                    type="text"
                    value={prescriptionSummary}
                    onChange={(e) => setPrescriptionSummary(e.target.value)}
                    placeholder="e.g. Amlodipine 5mg OD x 30 days"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingNotes}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{submittingNotes ? 'Concluding...' : 'Complete Consultation'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Ready for Next Consultation</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Queue has {queueData.totalWaiting} patients waiting. Next patient will be selected by highest dynamic priority score.
                </p>
              </div>

              <button
                onClick={handleCallNext}
                disabled={callingNext || queueData.totalWaiting === 0}
                className="w-full py-3 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 transition"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{callingNext ? 'Calling...' : 'Call Next Highest-Priority Patient'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Waiting Queue Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-hospital-600" />
                <span>Waiting Queue (Anti-Starvation Ordered)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Sorted by Dynamic Priority Score (Urgency Weight + α × Waiting Time)
              </p>
            </div>
            <span className="text-xs font-bold text-hospital-700 bg-hospital-50 px-2.5 py-1 rounded-full border border-hospital-200">
              {queueData.totalWaiting} waiting
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-100/70">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Pos</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Token</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Patient</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Urgency Tier</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Waited</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Dynamic Score</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-700">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {queueData.waitingQueue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No patients currently waiting in this department.
                    </td>
                  </tr>
                ) : (
                  queueData.waitingQueue.map((entry: any, index: number) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2.5 font-bold text-slate-400">#{index + 1}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-hospital-700">{entry.tokenDisplay}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {entry.appointment.patient.fullName}
                      </td>
                      <td className="px-3 py-2.5">
                        <TriageBadge tier={entry.currentTriageTier} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-mono">
                        {entry.elapsedWaitMinutes}m
                      </td>
                      <td className="px-3 py-2.5 font-bold font-mono text-purple-700">
                        {entry.dynamicPriorityScore.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setOverrideModalEntry(entry);
                            setOverrideNewTier(entry.currentTriageTier);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-hospital-600 transition"
                          title="Override triage urgency tier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Triage Override */}
      {overrideModalEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Clinical Triage Override</h3>
              <button onClick={() => setOverrideModalEntry(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                <p className="font-bold">Patient: {overrideModalEntry.appointment.patient.fullName}</p>
                <p>Current Tier: {overrideModalEntry.currentTriageTier} (Token {overrideModalEntry.tokenDisplay})</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">New Urgency Tier</label>
                <select
                  value={overrideNewTier}
                  onChange={(e) => setOverrideNewTier(Number(e.target.value))}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value={1}>Tier 1 - Resuscitation (Emergency Bypass)</option>
                  <option value={2}>Tier 2 - Emergent (High Urgency)</option>
                  <option value={3}>Tier 3 - Urgent (Moderate)</option>
                  <option value={4}>Tier 4 - Routine (Standard)</option>
                  <option value={5}>Tier 5 - Minor / Refill</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">
                  Mandatory Clinical Justification (min 10 characters)
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Detail clinical rationale for priority modification (recorded in permanent audit log)..."
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideModalEntry(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  Save Override & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
