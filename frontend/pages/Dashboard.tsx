import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dash.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">{t('dash.status')} <span className="text-emerald-500 font-medium">{t('dash.phase')}</span></p>
        </div>
        <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-slate-700 dark:text-white hover:bg-gray-50 transition-colors">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                Oct 2023 - Present
            </button>
            <button onClick={() => navigate('/evaluation')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[20px]">download</span>
                {t('dash.gen_report')}
            </button>
        </div>
      </div>

      {/* Hero Banner - Grid Item 1 */}
      <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden relative shadow-md group">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA7ekgr2BWribqt0CPOn44776TjIeE6FfyTWsx_ryvdyauIbMWX20zMQJQvfEc3Z_Qye031EAFc3bhpHE8AuRWA-8yOM91IO9_pWOfCjTculf5NgGHpBm9Ont4HyInORfcOm1mqUVoW1-qreCuFerUng1DSTG760gIW9__-BIycq7lD5wlVIG4sF0w3igtJFF_XyCzixvLGSe8APJXzHqYteJIbpRkUmBUjaa23a_KORqwsbg6QHdg0QcFoJAZwUtwAUQkTY5vKVxoO")'}}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"></div>
        <div className="absolute bottom-0 left-0 p-6 md:p-10 max-w-2xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3">
                {t('dash.latest_exp')}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">Dysarthric Speech Recognition v2.4</h2>
            <p className="text-gray-200 text-sm md:text-base leading-relaxed max-w-lg mb-6">
                {t('dash.exp_desc')}
            </p>
            <div className="flex gap-3">
                <button onClick={() => navigate('/evaluation')} className="px-6 py-2.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-colors">
                    {t('dash.view_analysis')}
                </button>
                <button onClick={() => navigate('/training')} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold rounded-lg transition-colors border border-white/20">
                    {t('dash.check_logs')}
                </button>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-36 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl text-primary">dataset</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">dataset</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">{t('dash.stat.samples')}</span>
            </div>
            <div>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">12,500</span>
                <p className="text-sm text-slate-500 mt-1">Audio recordings processed</p>
            </div>
        </div>

        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-36 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl text-emerald-500">model_training</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">model_training</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">{t('dash.stat.accuracy')}</span>
            </div>
            <div>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">94.2%</span>
                <p className="text-sm text-emerald-500 mt-1 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    CNN-STFT Model
                </p>
            </div>
        </div>

        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-36 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl text-purple-500">speed</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500">speed</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">{t('dash.stat.inference')}</span>
            </div>
            <div>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">12ms</span>
                <p className="text-sm text-slate-500 mt-1">Per sample on edge device</p>
            </div>
        </div>

        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-36 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl text-orange-500">bug_report</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">bug_report</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">{t('dash.stat.error')}</span>
            </div>
            <div>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">5.8%</span>
                <p className="text-sm text-emerald-500 mt-1 font-medium flex items-center gap-1">
                     <span className="material-symbols-outlined text-sm">arrow_downward</span>
                     -1.2% from last week
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions / Navigation Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dash.deep_dive')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => navigate('/evaluation')} className="group flex p-4 rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:shadow-md transition-all text-left">
                    <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">compare_arrows</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{t('sidebar.eval')}</h4>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Detailed breakdown of Accuracy, Loss, and F1 across architectures.</p>
                    </div>
                </button>

                <button onClick={() => navigate('/eda')} className="group flex p-4 rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 hover:shadow-md transition-all text-left">
                    <div className="size-12 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mr-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">graphic_eq</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">Spectrogram Analysis</h4>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Visual inspection of STFT features and class distribution.</p>
                    </div>
                </button>

                <button onClick={() => navigate('/evaluation')} className="group flex p-4 rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 hover:border-orange-500/50 hover:shadow-md transition-all text-left">
                    <div className="size-12 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center mr-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">grid_on</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">Confusion Matrices</h4>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Analyze misclassifications between mild and severe classes.</p>
                    </div>
                </button>

                <button onClick={() => navigate('/training')} className="group flex p-4 rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:shadow-md transition-all text-left">
                    <div className="size-12 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mr-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">bolt</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">{t('sidebar.train')}</h4>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Benchmarks for training duration and hardware utilization.</p>
                    </div>
                </button>
            </div>
        </div>

        {/* Activity Feed */}
        <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dash.activity')}</h3>
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4 h-full">
                <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <div className="size-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">update</span>
                        </div>
                        <div className="w-0.5 h-full bg-gray-100 dark:bg-gray-800"></div>
                    </div>
                    <div className="pb-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">New Dataset Uploaded</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Torgo_Dysarthric_Speech_v2.zip</p>
                        <span className="text-[10px] text-slate-400">2 hours ago</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                        </div>
                        <div className="w-0.5 h-full bg-gray-100 dark:bg-gray-800"></div>
                    </div>
                    <div className="pb-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Training Complete</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">MobileNetV3_Small_Quantized achieved 91% accuracy.</p>
                        <span className="text-[10px] text-slate-400">5 hours ago</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <div className="size-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">flag</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Evaluation Flagged</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">High false positive rate detected in 'Mild' class.</p>
                        <span className="text-[10px] text-slate-400">Yesterday</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;