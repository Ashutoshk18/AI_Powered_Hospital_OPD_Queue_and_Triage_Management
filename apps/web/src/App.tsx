import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { ReceptionistDashboard } from './features/receptionist/ReceptionistDashboard';
import { DoctorDashboard } from './features/doctor/DoctorDashboard';
import PatientPortal from './features/patient/PatientPortal';
import { Navbar } from './components/Navbar';

type Tab = 'admin' | 'receptionist' | 'doctor' | 'patient';

function AppContent() {
  const { user, loading } = useAuth();

  // Default active tab based on role
  const defaultTab = (): Tab => {
    if (!user) return 'patient';
    switch (user.role) {
      case 'ADMIN':
        return 'admin';
      case 'RECEPTIONIST':
        return 'receptionist';
      case 'DOCTOR':
        return 'doctor';
      default:
        return 'patient';
    }
  };

  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleTabChange = (tab: string) => setActiveTab(tab as Tab);

  const renderDashboard = () => {
    switch (activeTab) {
      case 'admin':
        return <AdminDashboard />;
      case 'receptionist':
        return <ReceptionistDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'patient':
      default:
        return <PatientPortal />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboard()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
