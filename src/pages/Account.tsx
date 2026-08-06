import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AccountDashboard from './AccountDashboard';
import AccountOrders from './AccountOrders';
import AccountProfile from './AccountProfile';
import AccountAddresses from './AccountAddresses';
import AccountLoyalty from './AccountLoyalty';
import AccountTryOns from './AccountTryOns';

export default function Account() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Routes>
      <Route index element={<AccountDashboard />} />
      <Route path="commandes" element={<AccountOrders />} />
      <Route path="profil" element={<AccountProfile />} />
      <Route path="adresses" element={<AccountAddresses />} />
      <Route path="fidelite" element={<AccountLoyalty />} />
      <Route path="essais" element={<AccountTryOns />} />
    </Routes>
  );
}
