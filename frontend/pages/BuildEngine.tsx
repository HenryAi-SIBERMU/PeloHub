import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const BuildEngine: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-6 text-center animate-in fade-in duration-500">
      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-500"></div>
        <div className="relative size-24 bg-white dark:bg-card-dark rounded-2xl shadow-xl flex items-center justify-center border border-gray-100 dark:border-gray-800">
            <span className="material-symbols-outlined text-5xl text-primary animate-pulse">construction</span>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">BETA</div>
      </div>

      <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
        {t('build.title')}
      </h1>
      
      <p className="text-lg text-slate-500 dark:text-gray-400 font-medium mb-6">
        {t('build.subtitle')}
      </p>

      <div className="max-w-md bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 dark:bg-gray-700"></div>
        <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
            {t('build.desc')}
        </p>
      </div>

      <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:scale-105 transition-transform shadow-lg">
        <span className="material-symbols-outlined text-[20px]">notifications_active</span>
        {t('build.notify')}
      </button>

      {/* Background decoration */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-primary/5 to-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
    </div>
  );
};

export default BuildEngine;