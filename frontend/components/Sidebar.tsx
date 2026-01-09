import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  
  const reportItems = [
    { path: '/', icon: 'dashboard', label: t('sidebar.overview') },
    { path: '/eda', icon: 'folder_open', label: t('sidebar.eda') },
    { path: '/evaluation', icon: 'analytics', label: t('sidebar.eval') },
    { path: '/training', icon: 'bolt', label: t('sidebar.train') },
    { path: '/build-engine', icon: 'construction', label: t('sidebar.build_engine') },
  ];

  const isReportActive = reportItems.some(item => item.path === location.pathname);
  const [isReportOpen, setIsReportOpen] = useState(true);

  useEffect(() => {
    if (isReportActive) {
      setIsReportOpen(true);
    }
  }, [location.pathname, isReportActive]);

  const isActive = (path: string) => {
    return location.pathname === path 
      ? "bg-primary/10 text-primary border-r-2 border-primary" 
      : "text-slate-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white";
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-card-dark border-r border-gray-200 dark:border-gray-800 fixed left-0 top-0 z-50">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100 dark:border-gray-800 justify-between">
        <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">graphic_eq</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Dysarthria AI</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
        
        <div className="px-6 mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Main Menu</span>
          
          {/* LANGUAGE TOGGLE */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
            <button 
                onClick={() => setLanguage('id')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${language === 'id' ? 'bg-white dark:bg-gray-700 shadow text-primary' : 'text-slate-500'}`}
            >
                ID
            </button>
            <button 
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${language === 'en' ? 'bg-white dark:bg-gray-700 shadow text-primary' : 'text-slate-500'}`}
            >
                EN
            </button>
          </div>
        </div>

        {/* Live Prediction */}
        <Link
            to="/prediction"
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive('/prediction')}`}
        >
            <span className="material-symbols-outlined text-[20px]">settings_voice</span>
            {t('sidebar.live')}
        </Link>
        
        {/* Analysis Logs */}
        <Link
            to="/logs"
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive('/logs')}`}
        >
            <span className="material-symbols-outlined text-[20px]">history</span>
            {t('sidebar.logs')}
        </Link>
        
        <div className="px-6 mb-2 mt-6">
          <span className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('sidebar.system')}</span>
        </div>

        {/* Engine Report Group */}
        <div className="flex flex-col mt-1">
            <button 
                onClick={() => setIsReportOpen(!isReportOpen)}
                className={`flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors w-full group ${isReportActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">description</span>
                    {t('sidebar.report')}
                </div>
                <span className={`material-symbols-outlined text-lg text-slate-400 transition-transform duration-200 ${isReportOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isReportOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-1 pb-2 relative">
                    <div className="absolute left-[29px] top-0 bottom-2 w-px bg-gray-100 dark:bg-gray-800"></div>
                    {reportItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 pl-12 pr-6 py-2.5 text-sm font-medium transition-colors relative ${isActive(item.path)}`}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${location.pathname === item.path ? 'opacity-100' : 'opacity-70'}`}>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>

        <button className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-slate-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors w-full text-left">
          <span className="material-symbols-outlined text-[20px]">settings</span>
          {t('sidebar.settings')}
        </button>
        <Link 
            to="/documentation"
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive('/documentation')}`}
        >
          <span className="material-symbols-outlined text-[20px]">menu_book</span>
          {t('sidebar.docs')}
        </Link>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
          <div className="size-9 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
            HA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">HenryAi</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{t('sidebar.role')}</p>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-sm">unfold_more</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;