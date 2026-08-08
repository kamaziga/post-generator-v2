import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Generator from './components/Generator';
import Offer from './Offer';
import PaymentSuccess from './PaymentSuccess';
import Rekvizity from './Rekvizity';
import History from './components/History';
import ContentPlan from './components/ContentPlan';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="loading-screen">Загрузка...</div>;

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <Link to="/" className="logo">⚡ PostGenerator</Link>
          <div className="nav-links">
            <Link to="/history">История</Link>
            <Link to="/content-plan">Контент-план</Link>
            <Link to="/analytics">Аналитика</Link>
            <Link to="/settings">⚙️ Настройки</Link>
            {!user ? (
              <button onClick={() => auth.signInAnonymously()} className="btn-login">Войти</button>
            ) : (
              <button onClick={() => signOut(auth)} className="btn-logout">Выйти</button>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Generator user={user} />} />
          <Route path="/offer" element={<Offer />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/rekvizity" element={<Rekvizity />} />
          <Route path="/history" element={<History />} />
          <Route path="/content-plan" element={<ContentPlan />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;