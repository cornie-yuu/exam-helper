import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Calendar, User } from 'lucide-react';

const navItems = [
  { path: '/', label: '开始', icon: Play },
  { path: '/plan', label: '计划', icon: Calendar },
  { path: '/profile', label: '我的', icon: User },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-50">
      <div className="max-w-2xl mx-auto flex items-center justify-around h-14">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-navy' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-normal'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
