import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { TriageBadge } from '../../components/TriageBadge';
import {
  UserPlus,
  Search,
  CheckCircle2,
  Calendar,
  Activity,
  X,
} from 'lucide-react';

export const ReceptionistDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [checkInAppt, setCheckInAppt] = useState<any | null>(null);
  const [issuedToken, setIssuedToken] = useState<any | null>(null);

  // Patient registration form
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    gender: 'MALE',
    dateOfBirth: '1990-01-01',
    phone: '',
    bloodGroup: 'O+',
    emergencyContact: '',
  });

  // Vitals form for check-in
  const [vitals, setVitals] = useState({
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 75,
    oxygenSaturation: 98,
    temperatureCelsius: 36.8,
    painScore: 2,
    respiratoryDistress: false,
    alteredMentalState: false,
  });

  const [triagePreview, setTriagePreview] = useState<{ tier: number; isEmergency: boolean; reason: string }>({
    tier: 4,
    isEmergency: false,
    reason: 'Stable baseline vitals',
  });

  const loadAppointments = async () => {
    try {
      const res = await api.getAppointments();
      setAppointments(res.appointments);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Update triage preview whenever vitals change in the modal
  useEffect(() => {
    if (vitals.alteredMentalState && vitals.respiratoryDistress) {
      setTriagePreview({ tier: 1, isEmergency: true, reason: 'CRITICAL: Mental status change with respiratory distress' });
    } else if (vitals.oxygenSaturation < 85) {
      setTriagePreview({ tier: 1, isEmergency: true, reason: 'CRITICAL: Severe hypoxia (SpO2 < 85%)' });
    } else if (vitals.respiratoryDistress || vitals.oxygenSaturation < 92 || vitals.painScore >= 9) {
      setTriagePreview({ tier: 2, isEmergency: false, reason: 'Emergent: Respiratory distress, low SpO2 or severe pain' });
    } else if (vitals.painScore >= 6 || vitals.temperatureCelsius >= 39.0 || vitals.heartRate >= 110) {
      setTriagePreview({ tier: 3, isEmergency: false, reason: 'Urgent: High pain, fever, or tachycardia' });
    } else {
      setTriagePreview({ tier: 4, isEmergency: false, reason: 'Standard routine vital signs' });
    }
  }, [vitals]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await api.searchPatients(searchQuery);
      setSearchResults(res.patients);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.registerPatient(patientForm);
      alert(`Patient registered successfully! MRN: ${res.patient.medicalRecordNumber}`);
      setShowRegisterModal(false);
      setPatientForm({
        fullName: '',
        gender: 'MALE',
        dateOfBirth: '1990-01-01',
        phone: '',
        bloodGroup: 'O+',
        emergencyContact: '',
      });
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInAppt) return;
    try {
      const res = await api.checkIn(checkInAppt.id, vitals);
      setIssuedToken({
        tokenDisplay: res.queueEntry.tokenDisplay,
        patientName: checkInAppt.patient.fullName,
        departmentName: checkInAppt.department.name,
        tier: res.triageResult.tier,
        estimatedWait: res.prediction.predicted_wait_minutes,
        source: res.prediction.source,
      });
      setCheckInAppt(null);
      loadAppointments();
    } catch (err: any) {
      alert(`Check-in failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hospital-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading appointments & intake desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Receptionist Desk & Patient Intake</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register outpatient walk-ins, triage vital assessment, and assign daily queue tokens
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-hospital-600 hover:bg-hospital-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Patient Registration</span>
          </button>
        </div>
      </div>

      {/* Patient Lookup Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patients by MRN, phone number, or full name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-hospital-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Lookup Patient
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Search Results ({searchResults.length}):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {searchResults.map((p) => (
                <div key={p.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{p.fullName}</p>
                  <p className="text-slate-500 font-mono">MRN: {p.medicalRecordNumber}</p>
                  <p className="text-slate-600">Phone: {p.phone} | Blood: {p.bloodGroup || 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's Appointments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-hospital-600" />
            <span>Today's Outpatient Appointments</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {appointments.length} appointments scheduled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">MRN</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department / Doctor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Time Slot</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Queue Token</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No appointments scheduled for today.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{appt.patient?.fullName}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{appt.patient?.medicalRecordNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{appt.department?.name}</span>
                      <span className="text-slate-400 block text-[11px]">{appt.doctor?.user?.fullName}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-hospital-700">
                      {appt.queueEntry ? appt.queueEntry.tokenDisplay : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {appt.status === 'SCHEDULED' ? (
                        <button
                          onClick={() => setCheckInAppt(appt)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] transition shadow-sm"
                        >
                          Check In & Triage
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Checked in</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Check In & Clinical Triage Assessment */}
      {checkInAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Check In & Urgency Triage Assessment</h3>
                <p className="text-xs text-slate-500">
                  Patient: {checkInAppt.patient.fullName} | Dept: {checkInAppt.department.name}
                </p>
              </div>
              <button onClick={() => setCheckInAppt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="mt-4 space-y-4">
              {/* Live Triage Score Indicator Banner */}
              <div
                className={`p-3 rounded-xl border flex items-start space-x-3 ${
                  triagePreview.isEmergency
                    ? 'bg-red-50 border-red-300 text-red-900 animate-pulse'
                    : 'bg-hospital-50 border-hospital-200 text-hospital-900'
                }`}
              >
                <Activity className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Triage Preview:</span>
                    <TriageBadge tier={triagePreview.tier} showDetails />
                  </div>
                  <p className="text-xs mt-1">{triagePreview.reason}</p>
                  {triagePreview.isEmergency && (
                    <p className="text-xs font-bold text-red-700 mt-1">
                      ⚠️ IMMEDIATE ACTION: Escort patient to Emergency Resuscitation Bay.
                    </p>
                  )}
                </div>
              </div>

              {/* Vitals Inputs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitals.systolicBP}
                    onChange={(e) => setVitals({ ...vitals, systolicBP: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitals.diastolicBP}
                    onChange={(e) => setVitals({ ...vitals, diastolicBP: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals({ ...vitals, heartRate: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Oxygen Saturation SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitals.oxygenSaturation}
                    onChange={(e) => setVitals({ ...vitals, oxygenSaturation: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.temperatureCelsius}
                    onChange={(e) => setVitals({ ...vitals, temperatureCelsius: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Pain Score (0 - 10): {vitals.painScore}</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={vitals.painScore}
                    onChange={(e) => setVitals({ ...vitals, painScore: Number(e.target.value) })}
                    className="w-full mt-2 accent-hospital-600"
                  />
                </div>
              </div>

              {/* Acute flags */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={vitals.respiratoryDistress}
                    onChange={(e) => setVitals({ ...vitals, respiratoryDistress: e.target.checked })}
                    className="rounded text-hospital-600 focus:ring-hospital-500"
                  />
                  <span className="font-semibold text-slate-800">Acute Respiratory Distress observed</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={vitals.alteredMentalState}
                    onChange={(e) => setVitals({ ...vitals, alteredMentalState: e.target.checked })}
                    className="rounded text-hospital-600 focus:ring-hospital-500"
                  />
                  <span className="font-semibold text-slate-800">Altered Mental State / Lethargy / Confusion</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCheckInAppt(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  Generate Token & Queue Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Token Issued Confirmation */}
      {issuedToken && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Check-in Complete</h3>
            <p className="text-xs text-slate-500 mt-1">{issuedToken.patientName} ({issuedToken.departmentName})</p>

            <div className="my-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Daily Queue Token</span>
              <p className="text-4xl font-extrabold font-mono text-hospital-700 my-1">{issuedToken.tokenDisplay}</p>
              <div className="flex justify-center my-2">
                <TriageBadge tier={issuedToken.tier} showDetails />
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs flex justify-between text-slate-600">
                <span>Estimated Wait:</span>
                <span className="font-bold text-slate-900">{issuedToken.estimatedWait} mins</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                <span>Inference:</span>
                <span className="font-semibold text-hospital-600">{issuedToken.source}</span>
              </div>
            </div>

            <button
              onClick={() => setIssuedToken(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow transition"
            >
              Print Slip & Close
            </button>
          </div>
        </div>
      )}

      {/* Modal: New Patient Registration */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Register New Outpatient</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={patientForm.fullName}
                  onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                  placeholder="e.g., Arthur Dent"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Gender</label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    placeholder="+1-555-0199"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Blood Group</label>
                  <input
                    type="text"
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                    placeholder="e.g., O+"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Emergency Contact</label>
                <input
                  type="text"
                  value={patientForm.emergencyContact}
                  onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: e.target.value })}
                  placeholder="Contact Name & Number"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-hospital-600 hover:bg-hospital-700 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
