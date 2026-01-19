import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import SavingsGoals from './pages/SavingsGoals';
import Analysis from './pages/Analysis';
import Achievements from './pages/Achievements';
import UpdateNotification from './components/UpdateNotification';

function App() {
  return (
    <Router>
      <UpdateNotification />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/savings-goals" element={<SavingsGoals />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/achievements" element={<Achievements />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

