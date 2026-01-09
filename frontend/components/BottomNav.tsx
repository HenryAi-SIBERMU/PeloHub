import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path ? "text-primary" : "text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300";

  return (
    <div className="fixed bottom-0 max-w-[480px] w-full bg-white dark:bg-[#111318] border-t border-gray-200 dark:border-gray-800 px-6 py-3 pb-6 z-50">
      <div className="flex justify-around items-center mx-auto">
        <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/')}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/' ? 'fill-1' : ''}`}>dashboard</span>
          <span className="text-[10px] font-medium">Overview</span>
        </Link>
        <Link to="/prediction" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/prediction')}`}>
          <span className="material-symbols-outlined">mic</span>
          <span className="text-[10px] font-medium">Live</span>
        </Link>
        <Link to="/evaluation" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/evaluation')}`}>
          <span className="material-symbols-outlined">analytics</span>
          <span className="text-[10px] font-medium">Analysis</span>
        </Link>
        <Link to="/eda" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/eda')}`}>
          <span className="material-symbols-outlined">folder_open</span>
          <span className="text-[10px] font-medium">Data</span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;