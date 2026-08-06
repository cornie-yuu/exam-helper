import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { SetupPage } from './components/SetupPage';
import { BottomNav } from './components/BottomNav';
import { PlanPage } from './pages/PlanPage';
import { ProfilePage } from './pages/ProfilePage';
import type { Course, ExamPlan } from './types';
import { loadPlan, clearPlan } from './utils/storage';

interface SetupData {
  courses: Course[];
  startDate: string;
}

function StartPage() {
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const navigate = useNavigate();

  const handleComplete = (newPlan: ExamPlan) => {
    setSetupData({
      courses: newPlan.courses,
      startDate: newPlan.startDate,
    });
    // 生成计划后自动跳转到"计划"页面
    navigate('/plan');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <SetupPage
        onComplete={handleComplete}
        initialData={setupData || undefined}
      />
    </div>
  );
}

function PlanRoute() {
  const [plan, setPlan] = useState<ExamPlan | null>(null);

  useEffect(() => {
    const savedPlan = loadPlan();
    if (savedPlan) {
      setPlan(savedPlan);
    }
  }, []);

  const handleReset = () => {
    clearPlan();
    setPlan(null);
  };

  return <PlanPage plan={plan} onReset={handleReset} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/plan" element={<PlanRoute />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
