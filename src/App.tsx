import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { FaCog } from 'react-icons/fa';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import LessonView from './pages/LessonView';
import AdminModal from './components/AdminModal';
import { theme } from './theme';
import { getData, saveData } from './services/dataService';
import type { AppData } from './services/dataService';

// Layout wrapper to handle Admin Button
const Layout: React.FC<{ children: React.ReactNode, onOpenAdmin: () => void }> = ({ children, onOpenAdmin }) => {
  const location = useLocation();
  const isLessonView = location.pathname.includes('/lesson/');

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.pageBackground || theme.colors.background,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily,
      position: 'relative'
    }}>
      {/* Admin Button - Hidden in Lesson View */}
      {!isLessonView && (
        <button
          onClick={onOpenAdmin}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: theme.colors.text.secondary,
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 50,
            opacity: 0.5
          }}
        >
          <FaCog />
        </button>
      )}

      {children}
    </div>
  );
};

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
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

  return (
    <Router>
      <Layout onOpenAdmin={() => setIsAdminOpen(true)}>
        <Routes>
          <Route path="/" element={<Home courses={data.courses} onRefresh={loadData} />} />
          <Route path="/course/:courseId" element={<CourseDetail courses={data.courses} />} />
          <Route path="/course/:courseId/lesson/:lessonId" element={<LessonView courses={data.courses} />} />
        </Routes>

        {isAdminOpen && (
          <AdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            data={data}
            onSave={handleSaveData}
          />
        )}
      </Layout>
    </Router>
  );
}

export default App;
