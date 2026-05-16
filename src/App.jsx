import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
// 🔥 FIX: Changed BrowserRouter to HashRouter here!
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import KantaBook from './pages/KantaBook';
import TakPatti from './pages/TakPatti';
import BazaarBills from './pages/BazaarBills';
import Padam from './pages/Padam';
import BazaarPayments from './pages/BazaarPayments';
import KathaBook from './pages/KathaBook';
import Traders from './pages/Traders';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kanta-book" element={<KantaBook />} />
        <Route path="/tak-patti" element={<TakPatti />} />
        <Route path="/bazaar-bills" element={<BazaarBills />} />
        <Route path="/padam" element={<Padam />} />
        <Route path="/bazaar-payments" element={<BazaarPayments />} />
        <Route path="/katha-book" element={<KathaBook />} />
        <Route path="/traders" element={<Traders />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {/* Router here is now using HashRouter behind the scenes */}
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App