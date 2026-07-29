import { useState, useEffect } from 'react';
import { SetupPage } from './components/SetupPage';
import { Dashboard } from './components/Dashboard';
import type { Course, ExamPlan } from './types';
import { loadPlan, clearPlan, clearCourses } from './utils/storage';

interface SetupData {
  courses: Course[];
  startDate: string;
}

function App() {
  const [plan, setPlan] = useState<ExamPlan | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);

  useEffect(() => {
    const savedPlan = loadPlan();
    if (savedPlan) {
      setPlan(savedPlan);
    }
  }, []);

  const handleComplete = (newPlan: ExamPlan) => {
    setPlan(newPlan);
    setSetupData({
      courses: newPlan.courses,
      startDate: newPlan.startDate,
    });
  };

  const handleBack = () => {
    if (plan) {
      setSetupData({
        courses: plan.courses,
        startDate: plan.startDate,
      });
    }
    setPlan(null);
  };

  const handleReset = () => {
    clearPlan();
    clearCourses();
    setPlan(null);
    setSetupData(null);
  };

  return (
    <div className="min-h-screen">
      <div className="content-wrapper">
        {plan ? (
          <Dashboard
            plan={plan}
            onReset={handleReset}
            onBack={handleBack}
          />
        ) : (
          <SetupPage
            onComplete={handleComplete}
            initialData={setupData || undefined}
          />
        )}
      </div>
    </div>
  );
}

export default App;
