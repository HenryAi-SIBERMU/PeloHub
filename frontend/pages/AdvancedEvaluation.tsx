import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdvancedEvaluation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Advanced Metrics</h1>
          <p className="text-slate-500 dark:text-gray-400">Detailed performance characteristics including ROC and PRC analysis</p>
        </div>
        <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-slate-700 dark:text-white hover:bg-gray-50 transition-colors">
                <span className="material-symbols-outlined text-[20px]">tune</span>
                Parameters
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[20px]">science</span>
                New Run
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">trophy</span>
            </div>
            <div>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Architecture</p>
                 <p className="text-lg font-bold text-slate-900 dark:text-white">CNN-STFT v2</p>
            </div>
        </div>
        <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">monitoring</span>
            </div>
            <div>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Best AUROC</p>
                 <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">0.982</p>
                    <span className="text-xs font-bold text-emerald-500">+2.4%</span>
                 </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROC Curve Chart */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">ROC Curve</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400">False Positive vs True Positive Rate</p>
              </div>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded text-sm font-bold">AUC 0.95</div>
            </div>
            
            <div className="relative w-full h-[300px] flex-1">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 200">
                {/* Grid Lines */}
                {[0, 50, 100, 150].map(y => <line key={y} className="text-gray-200 dark:text-gray-800" opacity="0.5" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="400" y1={y} y2={y}></line>)}
                <line className="text-gray-300 dark:text-gray-700" stroke="currentColor" strokeWidth="1" x1="0" x2="400" y1="200" y2="200"></line>
                
                <defs>
                  <linearGradient id="gradientPrimary" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#135bec" stopOpacity="0.3"></stop>
                    <stop offset="100%" stopColor="#135bec" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
                
                <line className="text-gray-400" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="400" y1="200" y2="0"></line>
                {/* Curve 1 */}
                <path d="M0 200 C 40 200, 40 60, 100 40 C 160 20, 250 10, 400 10 L 400 200 Z" fill="url(#gradientPrimary)"></path>
                <path d="M0 200 C 40 200, 40 60, 100 40 C 160 20, 250 10, 400 10" fill="none" stroke="#135bec" strokeWidth="3"></path>
                {/* Curve 2 */}
                <path d="M0 200 C 60 200, 80 120, 150 90 C 220 60, 300 50, 400 40" fill="none" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="2"></path>
              </svg>
              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-400 font-mono">
                <span>0.0</span><span>0.2</span><span>0.4</span><span>0.6</span><span>0.8</span><span>1.0</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-10 justify-center">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div><span className="text-sm font-medium text-slate-700 dark:text-gray-300">CNN-STFT</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-sm font-medium text-slate-700 dark:text-gray-300">ResNet-50 (TL)</span></div>
            </div>
        </div>

        {/* PR Curve Chart */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
             <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Precision-Recall</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400">AUPRC Analysis for Imbalanced Data</p>
              </div>
            </div>
            
            <div className="relative w-full h-[300px] flex-1">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 200">
                <line className="text-gray-300 dark:text-gray-700" stroke="currentColor" strokeWidth="1" x1="0" x2="400" y1="200" y2="200"></line>
                <line className="text-gray-300 dark:text-gray-700" stroke="currentColor" strokeWidth="1" x1="0" x2="0" y1="0" y2="200"></line>
                <path d="M0 20 C 50 20, 150 20, 200 40 C 280 72, 350 140, 400 200" fill="none" stroke="#c084fc" strokeLinecap="round" strokeWidth="3"></path>
                <path d="M0 50 C 60 50, 140 60, 180 90 C 240 135, 320 160, 400 200" fill="none" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="2"></path>
              </svg>
               <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-400 font-mono">
                <span>Recall 0.0</span><span>1.0</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-10 justify-center">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#c084fc]"></div><span className="text-sm font-medium text-slate-700 dark:text-gray-300">CNN-STFT</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-sm font-medium text-slate-700 dark:text-gray-300">VGG-16</span></div>
            </div>
        </div>
      </div>

      {/* Full Width Table */}
      <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Model Comparison Table</h3>
            <button className="text-primary text-sm font-bold uppercase tracking-wider flex items-center gap-1 hover:underline">
                Export Data <span className="material-symbols-outlined text-[16px]">download</span>
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">Model Name</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">Architecture Type</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">AUROC</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">AUPRC</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Inference (ms)</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Parameters</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-4 whitespace-nowrap"><div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary"></div>CNN-STFT v2</div></td>
                <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Lightweight</span></td>
                <td className="p-4 whitespace-nowrap text-right text-sm font-bold text-slate-900 dark:text-white">0.982</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.945</td>
                <td className="p-4 whitespace-nowrap text-right text-sm font-medium text-emerald-500">12ms</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">1.2M</td>
                </tr>
                <tr className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-4 whitespace-nowrap"><div className="font-medium text-sm text-slate-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-transparent"></div>ResNet-50</div></td>
                <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Transfer Learning</span></td>
                <td className="p-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-white">0.950</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.912</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">85ms</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">25M</td>
                </tr>
                 <tr className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-4 whitespace-nowrap"><div className="font-medium text-sm text-slate-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-transparent"></div>VGG-16</div></td>
                <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Transfer Learning</span></td>
                <td className="p-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-white">0.912</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.885</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">120ms</td>
                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">138M</td>
                </tr>
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancedEvaluation;