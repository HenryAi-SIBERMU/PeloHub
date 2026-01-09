import React from 'react';
import { useNavigate } from 'react-router-dom';

const TrainingEfficiency: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Training Efficiency Benchmarks</h1>
         <div className="relative">
          <button className="flex items-center gap-2 text-sm font-medium text-primary bg-white dark:bg-card-dark border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors shadow-sm">
            <span>Run: 2023-10-27_Final</span>
            <span className="material-symbols-outlined text-base">expand_more</span>
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
                 <div className="flex items-center gap-2 text-primary mb-2">
                    <span className="material-symbols-outlined text-xl">bolt</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Efficiency Winner</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">4.5x Faster Training</h2>
                 <p className="text-lg text-slate-500 dark:text-gray-400 leading-relaxed max-w-lg">
                    The <span className="text-slate-900 dark:text-white font-medium">lightweight CNN-STFT</span> model completes a full training epoch in under 5 minutes, reducing total experimentation time by hours compared to VGG-16.
                </p>
            </div>
            <div className="flex items-center justify-center md:justify-end">
                <div className="text-center px-6 py-4 bg-green-500/10 rounded-xl border border-green-500/20">
                     <p className="text-sm font-bold text-green-600 dark:text-green-400 uppercase">Total Time Saved</p>
                     <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">4h 35m</p>
                     <p className="text-xs text-gray-500 mt-1">Per experimental run</p>
                </div>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Duration Comparison (Total Training)</h3>
            </div>
            
            <div className="flex-1 flex items-end justify-around gap-8 relative px-4 min-h-[300px]">
                 {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0 h-full pb-8">
                    <div className="w-full border-t border-dashed border-gray-400"></div>
                    <div className="w-full border-t border-dashed border-gray-400"></div>
                    <div className="w-full border-t border-dashed border-gray-400"></div>
                    <div className="w-full border-t border-dashed border-gray-400"></div>
                    <div className="w-full border-b border-gray-400"></div>
                </div>

                {/* Bar 1 */}
                <div className="flex-1 flex flex-col items-center justify-end h-full z-10 group cursor-pointer">
                    <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded absolute -top-8">Slowest</div>
                    <div className="w-full max-w-[80px] bg-slate-200 dark:bg-gray-700 rounded-t-lg hover:bg-slate-300 dark:hover:bg-gray-600 transition-all duration-300 relative" style={{height: '100%'}}></div>
                    <span className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">VGG-16</span>
                    <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">5h 30m</span>
                </div>

                {/* Bar 2 */}
                <div className="flex-1 flex flex-col items-center justify-end h-full z-10 group cursor-pointer">
                    <div className="w-full max-w-[80px] bg-slate-200 dark:bg-gray-700 rounded-t-lg hover:bg-slate-300 dark:hover:bg-gray-600 transition-all duration-300" style={{height: '76%'}}></div>
                    <span className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ResNet-50</span>
                    <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">4h 12m</span>
                </div>

                {/* Bar 3 Winner */}
                <div className="flex-1 flex flex-col items-center justify-end h-full z-10 group cursor-pointer">
                    <div className="w-full max-w-[80px] bg-gradient-to-t from-primary to-blue-400 rounded-t-lg shadow-lg shadow-primary/30 transition-all duration-300 relative" style={{height: '17%'}}>
                         <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs font-bold py-1 px-3 rounded-full whitespace-nowrap shadow-md">Winner</div>
                    </div>
                    <span className="mt-4 text-xs font-bold text-primary uppercase tracking-wider">CNN-STFT</span>
                    <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">55m</span>
                </div>
            </div>
        </div>

        {/* Stats Column */}
        <div className="flex flex-col gap-4">
             <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                <h4 className="font-bold text-slate-900 dark:text-white">Lightweight CNN-STFT</h4>
                <div className="flex items-center gap-2 mt-1 mb-4">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">Proposed</span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">1.2M Params</span>
                </div>
                <div className="flex justify-between items-end border-t border-gray-100 dark:border-gray-800 pt-4">
                     <div>
                        <p className="text-xs text-gray-500 uppercase">Training Time</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">55 min</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Accuracy</p>
                        <p className="text-xl font-bold text-emerald-500">94.2%</p>
                     </div>
                </div>
            </div>

            <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm opacity-80">
                <h4 className="font-bold text-slate-900 dark:text-white">ResNet-50</h4>
                 <div className="flex items-center gap-2 mt-1 mb-4">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">Baseline</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">25M Params</span>
                </div>
                <div className="flex justify-between items-end border-t border-gray-100 dark:border-gray-800 pt-4">
                     <div>
                        <p className="text-xs text-gray-500 uppercase">Training Time</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">4h 12m</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Accuracy</p>
                        <p className="text-xl font-bold text-slate-700 dark:text-gray-300">93.1%</p>
                     </div>
                </div>
            </div>

             <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm opacity-80">
                <h4 className="font-bold text-slate-900 dark:text-white">VGG-16</h4>
                 <div className="flex items-center gap-2 mt-1 mb-4">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">Baseline</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">138M Params</span>
                </div>
                <div className="flex justify-between items-end border-t border-gray-100 dark:border-gray-800 pt-4">
                     <div>
                        <p className="text-xs text-gray-500 uppercase">Training Time</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">5h 30m</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Accuracy</p>
                        <p className="text-xl font-bold text-slate-700 dark:text-gray-300">91.8%</p>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingEfficiency;