import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- TYPE DEFINITIONS ---
type DataPoint = { x: number; y: number };
type ModelKey = 'cnn' | 'resnet' | 'vgg' | 'mobilenet';

// --- MOCK DATA GENERATOR ---
const generateCurveData = (quality: 'high' | 'mid' | 'low', type: 'roc' | 'pr'): DataPoint[] => {
  const points: DataPoint[] = [];
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x, y;

    if (type === 'roc') {
      x = t;
      if (quality === 'high') {
         y = 1 - Math.pow(1 - t, 6); 
      } else if (quality === 'mid') {
         y = 1 - Math.pow(1 - t, 3);
      } else {
         y = 1 - Math.pow(1 - t, 1.5);
      }
    } else {
      x = t;
      if (quality === 'high') {
         y = t < 0.9 ? 1 - (t * 0.05) : 0.95 - ((t-0.9) * 4);
      } else if (quality === 'mid') {
         y = 1 - (t * 0.3) - (t*t * 0.2);
      } else {
         y = 1 - (t * 0.6);
      }
    }
    y = Math.max(0, Math.min(1, y));
    points.push({ x, y });
  }
  return points;
};

// --- DATA CONSTANTS ---
const MODEL_DATA: Record<string, any> = {
  mobilenet: {
    id: 'mobilenet',
    name: 'MobileNetV3Small',
    badge: 'EfficientNet Family',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    color: 'text-emerald-500',
    strokeColor: '#10b981',
    bgColor: 'bg-emerald-500',
    metrics: { acc: '94.8%', f1: '0.945', auroc: '0.972', inference: '8ms' },
    efficiency: {
        params: "1,013,234",
        flops: "22.00 MFLOPs",
        size: "1.09 MB",
        activation: "6.91 KB"
    },
    cm: [
      { actual: 'Dysarthric', pred: [810, 40] },
      { actual: 'Non-Dysarthric', pred: [28, 422] }
    ],
    report: [
      { name: 'Dysarthric (Pelo)', p: 0.96, r: 0.95, f1: 0.96 },
      { name: 'Non-Dysarthric (Normal)', p: 0.91, r: 0.94, f1: 0.92 }
    ],
    rocData: generateCurveData('high', 'roc'),
    prData: generateCurveData('high', 'pr')
  },
  cnn: {
    id: 'cnn',
    name: 'CNN-STFT v2',
    badge: 'Lightweight Custom',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    color: 'text-primary',
    strokeColor: '#135bec',
    bgColor: 'bg-primary',
    metrics: { acc: '96.4%', f1: '0.962', auroc: '0.988', inference: '12ms' },
    efficiency: {
        params: "1,205,000",
        flops: "28.50 MFLOPs",
        size: "1.45 MB",
        activation: "8.20 KB"
    },
    cm: [
      { actual: 'Dysarthric', pred: [832, 18] },
      { actual: 'Non-Dysarthric', pred: [24, 426] }
    ],
    report: [
      { name: 'Dysarthric (Pelo)', p: 0.97, r: 0.98, f1: 0.98 },
      { name: 'Non-Dysarthric (Normal)', p: 0.96, r: 0.95, f1: 0.95 }
    ],
    rocData: generateCurveData('high', 'roc'),
    prData: generateCurveData('high', 'pr')
  },
  resnet: {
    id: 'resnet',
    name: 'ResNet-50',
    badge: 'Transfer Learning',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    color: 'text-purple-500',
    strokeColor: '#a855f7',
    bgColor: 'bg-purple-500',
    metrics: { acc: '93.1%', f1: '0.928', auroc: '0.950', inference: '85ms' },
    efficiency: {
        params: "25,557,032",
        flops: "4.10 GFLOPs",
        size: "98.20 MB",
        activation: "250.00 KB"
    },
    cm: [
      { actual: 'Dysarthric', pred: [790, 60] },
      { actual: 'Non-Dysarthric', pred: [35, 415] }
    ],
    report: [
      { name: 'Dysarthric (Pelo)', p: 0.95, r: 0.93, f1: 0.94 },
      { name: 'Non-Dysarthric (Normal)', p: 0.87, r: 0.92, f1: 0.89 }
    ],
    rocData: generateCurveData('mid', 'roc'),
    prData: generateCurveData('mid', 'pr')
  },
  vgg: {
    id: 'vgg',
    name: 'VGG-16',
    badge: 'Transfer Learning',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    color: 'text-orange-500',
    strokeColor: '#f97316',
    bgColor: 'bg-orange-500',
    metrics: { acc: '91.2%', f1: '0.905', auroc: '0.912', inference: '120ms' },
    efficiency: {
        params: "138,357,544",
        flops: "15.30 GFLOPs",
        size: "528.00 MB",
        activation: "1.20 MB"
    },
    cm: [
      { actual: 'Dysarthric', pred: [760, 90] },
      { actual: 'Non-Dysarthric', pred: [50, 400] }
    ],
    report: [
      { name: 'Dysarthric (Pelo)', p: 0.93, r: 0.89, f1: 0.91 },
      { name: 'Non-Dysarthric (Normal)', p: 0.81, r: 0.88, f1: 0.84 }
    ],
    rocData: generateCurveData('low', 'roc'),
    prData: generateCurveData('low', 'pr')
  }
};

const ModelEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'deep-dive'>('deep-dive');
  const [selectedModelKey, setSelectedModelKey] = useState<string>('mobilenet');

  const activeModel = MODEL_DATA[selectedModelKey];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 pb-20">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Model Evaluation</h1>
          <p className="text-slate-500 dark:text-gray-400">Comprehensive performance analysis: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded ml-2">Binary Classification (Disartria vs Non-Disartria)</span></p>
        </div>
        
        {/* Main Tab Switcher */}
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
            <button 
                onClick={() => setActiveTab('overview')} 
                className={`flex items-center gap-2 py-2 px-6 rounded-md text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}
            >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Overview
            </button>
            <button 
                onClick={() => setActiveTab('deep-dive')} 
                className={`flex items-center gap-2 py-2 px-6 rounded-md text-sm font-bold transition-all ${activeTab === 'deep-dive' ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400'}`}
            >
                <span className="material-symbols-outlined text-[18px]">manage_search</span>
                Deep Dive
            </button>
        </div>
      </div>

      {/* ======================= TAB: OVERVIEW ======================= */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* SECTION 1: KEY PERFORMANCE INDICATORS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KPICard title="Best Accuracy" value="96.4%" sub="CNN-STFT v2" icon="check_circle" color="text-primary" bg="bg-primary/10" />
                <KPICard title="Most Efficient" value="22 MFLOPs" sub="MobileNetV3Small" icon="bolt" color="text-emerald-500" bg="bg-emerald-500/10" />
                <KPICard title="Best AUROC" value="0.988" sub="CNN-STFT v2" icon="ssid_chart" color="text-purple-500" bg="bg-purple-500/10" />
                <KPICard title="Lowest Latency" value="8ms" sub="MobileNetV3Small" icon="speed" color="text-orange-500" bg="bg-orange-500/10" />
            </div>

            {/* SECTION 4: FULL COMPARISON TABLE & CHART */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-primary pl-3 mb-4">Binary Classification Benchmark</h2>
                
                {/* Performance Chart */}
                <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Metric Comparison</h3>
                        <div className="flex gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500"></span>Accuracy</div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-400"></span>Precision</div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400"></span>Recall</div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-400"></span>F1 Score</div>
                        </div>
                    </div>
                    <PerformanceComparisonChart />
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Model Ranking</h3>
                        <button className="text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:underline">
                            Export Data <span className="material-symbols-outlined text-[16px]">download</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">Model Name</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">Architecture Type</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Accuracy</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Precision</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Recall</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">F1 Score</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Params</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Model Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            <tr className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors bg-primary/5">
                                <td className="p-4 whitespace-nowrap">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-primary animate-pulse"></div>CNN-STFT v2
                                    </div>
                                </td>
                                <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 tracking-wider">Lightweight</span></td>
                                <td className="p-4 whitespace-nowrap text-right text-sm font-bold text-slate-900 dark:text-white">96.4%</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.965</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.980</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono font-bold">0.962</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">1.2M</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">1.45 MB</td>
                            </tr>
                            <tr className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-4 whitespace-nowrap"><div className="font-medium text-sm text-slate-900 dark:text-white flex items-center gap-2"><div className="size-2 rounded-full bg-emerald-500"></div>MobileNetV3Small</div></td>
                                <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 tracking-wider">EfficientNet</span></td>
                                <td className="p-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-white">94.8%</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.952</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.950</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono font-bold">0.945</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">1.0M</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">1.09 MB</td>
                            </tr>
                            <tr className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-4 whitespace-nowrap"><div className="font-medium text-sm text-slate-900 dark:text-white flex items-center gap-2"><div className="size-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>ResNet-50</div></td>
                                <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 tracking-wider">Transfer Learning</span></td>
                                <td className="p-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-white">93.1%</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.925</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.930</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono font-bold">0.928</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">25.5M</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">98.2 MB</td>
                            </tr>
                            <tr className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-4 whitespace-nowrap"><div className="font-medium text-sm text-slate-900 dark:text-white flex items-center gap-2"><div className="size-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>VGG-16</div></td>
                                <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 tracking-wider">Transfer Learning</span></td>
                                <td className="p-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-white">91.2%</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.900</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">0.890</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono font-bold">0.905</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">138M</td>
                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">528 MB</td>
                            </tr>
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ======================= TAB: DEEP DIVE ======================= */}
      {activeTab === 'deep-dive' && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* MODEL SELECTOR BAR */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-card-dark/90 backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider hidden md:block">Active Model:</span>
                    <select 
                        value={selectedModelKey}
                        onChange={(e) => setSelectedModelKey(e.target.value)}
                        className="bg-gray-50 dark:bg-[#151b26] border border-gray-200 dark:border-gray-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full md:w-64 p-2.5 font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <option value="mobilenet">MobileNetV3Small (New)</option>
                        <option value="cnn">CNN-STFT v2 (Best Acc)</option>
                        <option value="resnet">ResNet-50</option>
                        <option value="vgg">VGG-16</option>
                    </select>
                    <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${activeModel.badgeColor}`}>
                        {activeModel.badge}
                    </span>
                </div>

                <div className="flex gap-8 w-full md:w-auto justify-around md:justify-end">
                    <div className="text-center">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Accuracy</span>
                        <p className={`text-xl font-black ${activeModel.color}`}>{activeModel.metrics.acc}</p>
                    </div>
                    <div className="text-center border-l border-gray-200 dark:border-gray-700 pl-8">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">AUROC</span>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{activeModel.metrics.auroc}</p>
                    </div>
                     <div className="text-center border-l border-gray-200 dark:border-gray-700 pl-8">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Inference</span>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{activeModel.metrics.inference}</p>
                    </div>
                </div>
            </div>

            {/* COMPUTATIONAL EFFICIENCIES (NEW SECTION) */}
            <div>
                 <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-primary pl-3 mb-4 flex items-center gap-2">
                    Computational Efficiencies
                    <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">Hardware: Raspberry Pi 4B</span>
                 </h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-slate-400 text-lg">memory</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Parameter</span>
                        </div>
                        <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{activeModel.efficiency.params}</p>
                    </div>
                    <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-slate-400 text-lg">functions</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">FLOPs</span>
                        </div>
                        <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{activeModel.efficiency.flops}</p>
                    </div>
                    <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-slate-400 text-lg">sd_card</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">8-bit Size Est.</span>
                        </div>
                        <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{activeModel.efficiency.size}</p>
                    </div>
                    <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-slate-400 text-lg">bolt</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">8-bit Activation</span>
                        </div>
                        <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{activeModel.efficiency.activation}</p>
                    </div>
                 </div>
            </div>

            {/* SECTION 2: STATISTICAL CURVES (Interactive) */}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-primary pl-3">Binary Classification Reliability</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ROC Curve Chart */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[420px]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">ROC Curve</h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400">False Positive Rate vs True Positive Rate</p>
                        </div>
                        <div className={`px-3 py-1 rounded text-xs font-bold text-white ${activeModel.bgColor}`}>AUC {activeModel.metrics.auroc}</div>
                    </div>
                    <InteractiveCurve 
                        data={activeModel.rocData} 
                        color={activeModel.strokeColor} 
                        fillColor={activeModel.color}
                        type="roc"
                        xLabel="False Positive Rate"
                        yLabel="True Positive Rate"
                    />
                </div>

                {/* PR Curve Chart */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[420px]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">Precision-Recall</h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400">Precision vs Recall Analysis</p>
                        </div>
                        <div className={`px-3 py-1 rounded text-xs font-bold text-white ${activeModel.bgColor}`}>F1 {activeModel.metrics.f1}</div>
                    </div>
                    <InteractiveCurve 
                        data={activeModel.prData} 
                        color={activeModel.strokeColor} 
                        fillColor={activeModel.color}
                        type="pr"
                        xLabel="Recall (Sensitivity)"
                        yLabel="Precision"
                    />
                </div>
            </div>

            {/* SECTION 3: CLASS DETAILS & CONFUSION MATRIX (Interactive) */}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-primary pl-3">Binary Class Performance</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Classification Report */}
                <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Classification Report</h3>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border border-current opacity-80 ${activeModel.color}`}>{activeModel.name}</div>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                        {activeModel.report.map((row: any) => (
                            <div key={row.name} className="bg-gray-50 dark:bg-[#151b26] rounded-xl p-5 border border-gray-100 dark:border-gray-800/50">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-10 rounded-full ${activeModel.bgColor}`}></div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{row.name}</h4>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wide">Precision</span>
                                        <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{row.p}</p>
                                    </div>
                                    <div className="text-center border-l border-gray-200 dark:border-gray-700">
                                        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wide">Recall</span>
                                        <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{row.r}</p>
                                    </div>
                                    <div className="text-center border-l border-gray-200 dark:border-gray-700">
                                        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wide">F1-Score</span>
                                        <p className={`text-base font-bold mt-1 ${activeModel.color}`}>{row.f1}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Confusion Matrix (Interactive) */}
                <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Confusion Matrix (2x2)</h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-sm ${activeModel.bgColor} opacity-20`}></span>
                            <span className="text-[10px] text-slate-500">Predicted</span>
                        </div>
                    </div>
                    
                    <InteractiveConfusionMatrix model={activeModel} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- HELPER COMPONENTS ---

const PerformanceComparisonChart = () => {
    // Data matched to the table in the overview
    const chartData = [
        { name: 'CNN-STFT', acc: 96.4, prec: 96.5, rec: 98.0, f1: 96.2 },
        { name: 'MobileNetV3', acc: 94.8, prec: 95.2, rec: 95.0, f1: 94.5 },
        { name: 'ResNet-50', acc: 93.1, prec: 92.5, rec: 93.0, f1: 92.8 },
        { name: 'VGG-16', acc: 91.2, prec: 90.0, rec: 89.0, f1: 90.5 },
    ];

    // Helper to scale values: 80% baseline -> 0% height, 100% -> 100% height
    // Range is 20 points. Multiplier is 5.
    const getHeight = (val: number) => Math.max(0, (val - 80) * 5);

    return (
        <div className="h-64 w-full flex items-end justify-between gap-2 sm:gap-4 md:px-4 relative">
             {/* Y-Axis Guidelines (Absolute Background) */}
            <div className="absolute inset-x-4 top-4 bottom-8 flex flex-col justify-between pointer-events-none z-0">
                 {/* 100% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">100%</span>
                </div>
                 {/* 95% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">95%</span>
                </div>
                 {/* 90% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">90%</span>
                </div>
                 {/* 85% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">85%</span>
                </div>
                 {/* 80% Baseline */}
                <div className="w-full border-t border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">80%</span>
                </div>
            </div>

            {/* Bars container overlay */}
            <div className="flex w-full h-full items-end justify-between gap-2 sm:gap-4 z-10 pl-6 pt-4 pb-8"> 
                {chartData.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col gap-1 sm:gap-2 h-full justify-end group cursor-crosshair">
                        {/* Bars Group */}
                        <div className="flex items-end justify-center gap-0.5 sm:gap-1 h-full relative w-full">
                            {/* Hover Tooltip */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-lg">
                                <div className="font-bold border-b border-white/20 pb-1 mb-1">{item.name}</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                    <span>Acc: <span className="font-mono">{item.acc}%</span></span> 
                                    <span>Prec: <span className="font-mono">{item.prec}%</span></span>
                                    <span>Rec: <span className="font-mono">{item.rec}%</span></span> 
                                    <span>F1: <span className="font-mono">{item.f1}%</span></span>
                                </div>
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>

                            {/* Accuracy Bar */}
                            <div className="w-1/4 bg-blue-500 rounded-t-sm hover:brightness-110 transition-all relative" style={{height: `${getHeight(item.acc)}%`}}></div>
                            {/* Precision Bar */}
                            <div className="w-1/4 bg-indigo-400 rounded-t-sm hover:brightness-110 transition-all" style={{height: `${getHeight(item.prec)}%`}}></div>
                            {/* Recall Bar */}
                            <div className="w-1/4 bg-emerald-400 rounded-t-sm hover:brightness-110 transition-all" style={{height: `${getHeight(item.rec)}%`}}></div>
                            {/* F1 Bar */}
                            <div className="w-1/4 bg-violet-400 rounded-t-sm hover:brightness-110 transition-all" style={{height: `${getHeight(item.f1)}%`}}></div>
                        </div>
                        <p className="text-[10px] font-bold text-center text-slate-500 dark:text-gray-400 truncate w-full mt-2">{item.name}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

const InteractiveConfusionMatrix = ({ model }: { model: any }) => {
  const [hoveredCell, setHoveredCell] = useState<{r: number, c: number} | null>(null);
  
  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-[#151b26]/50 relative">
        {/* Tooltip */}
        {hoveredCell !== null && (
            <div className="absolute top-4 right-4 z-20 bg-white dark:bg-card-dark p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 text-xs animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                {(() => {
                    const row = model.cm[hoveredCell.r];
                    const count = row.pred[hoveredCell.c];
                    const actualLabel = row.actual;
                    const predLabel = hoveredCell.c === 0 ? 'Dysarthric' : 'Non-Dysarthric';
                    const type = 
                        hoveredCell.r === 0 && hoveredCell.c === 0 ? 'True Positive (Sensitivity)' :
                        hoveredCell.r === 0 && hoveredCell.c === 1 ? 'False Negative (Miss)' :
                        hoveredCell.r === 1 && hoveredCell.c === 0 ? 'False Positive (False Alarm)' :
                        'True Negative (Specificity)';
                    
                    const rowTotal = row.pred.reduce((a:number, b:number) => a + b, 0);
                    const rowPct = ((count / rowTotal) * 100).toFixed(1);

                    return (
                        <div className="flex flex-col gap-1 min-w-[160px]">
                            <span className="font-bold text-slate-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1 mb-1">{type}</span>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Count:</span>
                                <span className="font-mono font-bold">{count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Row Share:</span>
                                <span className="font-mono font-bold">{rowPct}%</span>
                            </div>
                             <div className="text-[10px] text-slate-400 mt-1">
                                Actual: {actualLabel} <br/> Pred: {predLabel}
                            </div>
                        </div>
                    )
                })()}
            </div>
        )}

      <div className="flex items-center gap-4">
        {/* Y-Axis Label (Rotated) */}
        <div className="-rotate-90 text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase whitespace-nowrap w-4 h-full flex items-center justify-center">
            True Label
        </div>

        <div>
            {/* Grid Header (Spacer + Column Labels) */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-2">
                <div className="w-24"></div> {/* Spacer for row labels */}
                <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dysarthric</div>
                <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Non-Dysarthric</div>
            </div>

            {/* Grid Content */}
            <div className="flex flex-col gap-3">
                {model.cm.map((row: any, rIdx: number) => (
                    <div key={rIdx} className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
                        {/* Row Label */}
                        <div className="w-24 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider pr-2">
                            {row.actual}
                        </div>
                        
                        {/* Cells */}
                        {row.pred.map((val: number, cIdx: number) => {
                            const isDiag = rIdx === cIdx;
                             let bgClass = '';
                             let textClass = 'text-slate-600 dark:text-gray-300';
                             let borderClass = 'border-gray-200 dark:border-gray-800';

                             if (isDiag) {
                                bgClass = `${model.bgColor} ${val > 300 ? 'bg-opacity-100' : val > 100 ? 'bg-opacity-80' : 'bg-opacity-60'}`;
                                textClass = 'text-white';
                                borderClass = 'border-transparent';
                             } else {
                                bgClass = val > 20 ? 'bg-red-500/10' : 'bg-white dark:bg-card-dark';
                                if (val > 20) {
                                    textClass = 'text-red-600 dark:text-red-400 font-bold';
                                    borderClass = 'border-red-500/20';
                                }
                             }
                             
                             const isHovered = hoveredCell?.r === rIdx && hoveredCell?.c === cIdx;
                             const isDimmed = hoveredCell !== null && !isHovered;

                             return (
                                <div 
                                    key={cIdx}
                                    onMouseEnter={() => setHoveredCell({r: rIdx, c: cIdx})}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    className={`
                                        size-28 sm:size-32 rounded-xl flex flex-col items-center justify-center 
                                        shadow-sm border transition-all duration-200 cursor-pointer
                                        ${bgClass} ${textClass} ${borderClass}
                                        ${isHovered ? 'scale-105 shadow-lg z-10 ring-2 ring-offset-2 ring-offset-[#101622] ring-current' : ''}
                                        ${isDimmed ? 'opacity-40 grayscale' : 'opacity-100'}
                                    `}
                                >
                                    <span className="text-3xl font-black">{val}</span>
                                    <span className={`text-[10px] uppercase font-bold mt-2 px-2 py-0.5 rounded-full ${isDiag ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-slate-500'}`}>
                                        {rIdx === 0 && cIdx === 0 ? 'True Pos' : ''}
                                        {rIdx === 0 && cIdx === 1 ? 'False Neg' : ''}
                                        {rIdx === 1 && cIdx === 0 ? 'False Pos' : ''}
                                        {rIdx === 1 && cIdx === 1 ? 'True Neg' : ''}
                                    </span>
                                </div>
                             );
                        })}
                    </div>
                ))}
            </div>
            
             {/* X-Axis Label Bottom */}
             <div className="text-center mt-4 text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase pl-24">
                Predicted Label
            </div>
        </div>
      </div>
    </div>
  );
};

const InteractiveCurve: React.FC<{
    data: DataPoint[];
    color: string;
    fillColor: string;
    type: 'roc' | 'pr';
    xLabel: string;
    yLabel: string;
}> = ({ data, color, fillColor, type, xLabel, yLabel }) => {
    const [hoverPoint, setHoverPoint] = useState<DataPoint | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    
    // Chart Dimensions
    const width = 400;
    const height = 250;
    const padding = 30;
    
    // Scale functions
    const scaleX = (val: number) => padding + val * (width - 2 * padding);
    const scaleY = (val: number) => height - padding - val * (height - 2 * padding);

    // Generate Path d
    const pathD = useMemo(() => {
        if (data.length === 0) return '';
        const d = data.map((pt, i) => 
            `${i === 0 ? 'M' : 'L'} ${scaleX(pt.x)} ${scaleY(pt.y)}`
        ).join(' ');
        return d;
    }, [data]);

    // Generate Fill Area
    const fillD = useMemo(() => {
        if (data.length === 0) return '';
        // Close the path to the axes
        return `${pathD} L ${scaleX(data[data.length-1].x)} ${scaleY(0)} L ${scaleX(data[0].x)} ${scaleY(0)} Z`;
    }, [pathD, data]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Find closest point based on X
        // Reverse scale X
        const rawX = (x - padding) / (width - 2 * padding);
        const clampedX = Math.max(0, Math.min(1, rawX));
        
        // Simple search (assuming sorted X)
        const closest = data.reduce((prev, curr) => 
            Math.abs(curr.x - clampedX) < Math.abs(prev.x - clampedX) ? curr : prev
        );
        
        setHoverPoint(closest);
    };

    const handleMouseLeave = () => {
        setHoverPoint(null);
    };

    return (
        <div className="relative w-full h-full bg-gray-50/50 dark:bg-black/10 rounded-lg border border-gray-100 dark:border-gray-800/50 overflow-hidden cursor-crosshair">
            <svg 
                ref={svgRef}
                className="w-full h-full" 
                viewBox={`0 0 ${width} ${height}`} 
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Grid Lines Y */}
                {[0, 0.25, 0.5, 0.75, 1].map(val => (
                    <line 
                        key={val} 
                        x1={padding} 
                        y1={scaleY(val)} 
                        x2={width - padding} 
                        y2={scaleY(val)} 
                        stroke="currentColor" 
                        strokeOpacity="0.1" 
                        className="text-slate-500"
                        strokeDasharray="2 2"
                    />
                ))}
                 {/* Grid Lines X */}
                 {[0, 0.25, 0.5, 0.75, 1].map(val => (
                    <line 
                        key={val} 
                        x1={scaleX(val)} 
                        y1={scaleY(0)} 
                        x2={scaleX(val)} 
                        y2={scaleY(1)} 
                        stroke="currentColor" 
                        strokeOpacity="0.1" 
                        className="text-slate-500"
                        strokeDasharray="2 2"
                    />
                ))}

                {/* Axes */}
                <line x1={padding} y1={scaleY(0)} x2={width - padding} y2={scaleY(0)} stroke="currentColor" className="text-slate-400" strokeWidth="1" />
                <line x1={padding} y1={scaleY(0)} x2={padding} y2={scaleY(1)} stroke="currentColor" className="text-slate-400" strokeWidth="1" />

                {/* Reference Line for ROC (Diagonal) */}
                {type === 'roc' && (
                    <line 
                        x1={scaleX(0)} y1={scaleY(0)} 
                        x2={scaleX(1)} y2={scaleY(1)} 
                        stroke="currentColor" 
                        className="text-slate-300 dark:text-slate-600" 
                        strokeWidth="1.5" 
                        strokeDasharray="4 4" 
                    />
                )}
                 {/* Reference Line for PR (Baseline ~0.5 for balanced, varies here) */}
                 {type === 'pr' && (
                    <line 
                        x1={scaleX(0)} y1={scaleY(0.5)} 
                        x2={scaleX(1)} y2={scaleY(0.5)} 
                        stroke="currentColor" 
                        className="text-slate-300 dark:text-slate-600" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                    />
                )}

                {/* Area Fill */}
                <path d={fillD} fill={color} fillOpacity="0.1" />

                {/* Curve */}
                <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Interactive Elements */}
                {hoverPoint && (
                    <g>
                        {/* Cursor Line Vertical */}
                        <line 
                            x1={scaleX(hoverPoint.x)} y1={scaleY(0)} 
                            x2={scaleX(hoverPoint.x)} y2={scaleY(1)} 
                            stroke={color} 
                            strokeWidth="1" 
                            strokeDasharray="2 2"
                        />
                         {/* Cursor Line Horizontal */}
                         <line 
                            x1={padding} y1={scaleY(hoverPoint.y)} 
                            x2={width-padding} y2={scaleY(hoverPoint.y)} 
                            stroke={color} 
                            strokeWidth="1" 
                            strokeDasharray="2 2"
                        />
                        {/* Point */}
                        <circle cx={scaleX(hoverPoint.x)} cy={scaleY(hoverPoint.y)} r="4" fill={color} stroke="white" strokeWidth="2" />
                    </g>
                )}
            </svg>

            {/* Labels */}
            <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{xLabel}</div>
            <div className="absolute top-0 bottom-0 left-1 w-4 flex items-center justify-center">
                 <span className="-rotate-90 whitespace-nowrap text-[10px] font-bold text-slate-400 uppercase tracking-widest">{yLabel}</span>
            </div>

            {/* Tooltip (HTML overlay) */}
            {hoverPoint && (
                <div 
                    className="absolute bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs rounded px-2 py-1 pointer-events-none shadow-lg border border-white/10 backdrop-blur-sm z-20"
                    style={{ 
                        left: `${(hoverPoint.x * 80) + 10}%`, 
                        top: `${(1 - hoverPoint.y) * 60 + 20}%`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="font-mono font-bold">{hoverPoint.y.toFixed(3)}</div>
                    <div className="text-[9px] opacity-70 uppercase">@ {hoverPoint.x.toFixed(2)}</div>
                </div>
            )}
        </div>
    );
};

const KPICard = ({ title, value, sub, icon, color, bg }: any) => (
  <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
    <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
        <div className={`size-8 rounded-full ${bg} ${color} flex items-center justify-center`}>
            <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
    </div>
    <div>
        <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
        <span className={`text-xs font-bold ${color} ${bg} px-2 py-0.5 rounded-full mt-2 inline-block`}>{sub}</span>
    </div>
  </div>
);

export default ModelEvaluation;