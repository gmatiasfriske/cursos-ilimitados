import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { FaCog } from 'react-icons/fa';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import LessonView from './pages/LessonView';
import ExamManager from './pages/ExamManager';
import AdminModal from './components/AdminModal';
import { theme } from './theme';
import { getData, saveData } from './services/dataService';
import type { AppData } from './services/dataService';

// Layout wrapper to handle Admin Button
const Layout: React.FC<{ children: React.ReactNode, isAdmin: boolean, onGearClick: () => void }> = ({ children, isAdmin, onGearClick }) => {
  const location = useLocation();
  const hideAdminButton = location.pathname.includes('/lesson/') || location.pathname.includes('/admin/exams/');

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.pageBackground || theme.colors.background,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily,
      position: 'relative'
    }}>
      {/* Admin Button - Hidden in Lesson View */}
      {!hideAdminButton && (
        <button
          onClick={onGearClick}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: isAdmin ? theme.colors.primary : theme.colors.text.secondary,
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 50,
            opacity: isAdmin ? 1 : 0.5,
            transition: 'all 0.3s'
          }}
        >
          <FaCog className={isAdmin ? 'spin-once' : ''} />
        </button>
      )}

      {children}

      <style>{`
        .spin-once {
          animation: spinOnce 0.5s ease-in-out;
        }
        @keyframes spinOnce {
          from { transform: rotate(0deg); }
          to { transform: rotate(180deg); }
        }
      `}</style>
    </div>
  );
};

function AppContent() {
  const navigate = useNavigate();
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('is_admin') === 'true');
  const [data, setData] = useState<AppData>({ courses: [] });

  // Load data function
  const loadData = async () => {
    const d = await getData();
    setData(d);
    return d;
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveData = (newData: AppData) => {
    setData(newData);
    saveData(newData);
  };

  const handleGearClick = () => {
    if (isAdmin) {
      setIsAdmin(false);
      localStorage.removeItem('is_admin');
    } else {
      setIsAdminOpen(true);
    }
  };

  return (
    <Layout isAdmin={isAdmin} onGearClick={handleGearClick}>
      <Routes>
        <Route path="/" element={<Home courses={data.courses} onRefresh={loadData} />} />
        <Route path="/course/:courseId" element={<CourseDetail courses={data.courses} isAdmin={isAdmin} />} />
        <Route path="/course/:courseId/lesson/:lessonId" element={<LessonView courses={data.courses} isAdmin={isAdmin} />} />
        <Route path="/admin/exams/:courseId" element={<ExamManager />} />
      </Routes>

      {isAdminOpen && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          data={data}
          onSave={handleSaveData}
          setIsAdmin={(val: boolean) => {
            setIsAdmin(val);
            if (val) localStorage.setItem('is_admin', 'true');
            else localStorage.removeItem('is_admin');
          }}
          navigate={navigate}
        />
      )}
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
