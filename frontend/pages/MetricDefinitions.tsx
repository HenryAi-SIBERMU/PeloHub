import React from 'react';
import { useNavigate } from 'react-router-dom';

const MetricDefinitions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Metric Definitions</h1>
          <p className="text-slate-500 dark:text-gray-400">Glossary of performance indicators used in this research</p>
        </div>
        <div className="relative w-64 hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input 
                type="text" 
                placeholder="Search metrics..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { 
              title: "Accuracy", 
              subtitle: "Overall correctness", 
              icon: "check_circle", 
              colorClass: "text-primary", 
              bgClass: "bg-blue-100 dark:bg-blue-900/30",
              desc: "The ratio of correctly predicted observations to the total observations.",
              formula: "(TP + TN) / Total",
              usage: "General performance indicator."
            },
            {
              title: "Precision",
              subtitle: "Positive predictive value",
              icon: "filter_center_focus",
              colorClass: "text-indigo-500 dark:text-indigo-400",
              bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
              desc: "The ratio of correctly predicted positive observations to the total predicted positive observations.",
              formula: "TP / (TP + FP)",
              usage: "Minimizing false positives."
            },
            {
              title: "Recall",
              subtitle: "Sensitivity / True Positive Rate",
              icon: "graphic_eq",
              colorClass: "text-emerald-600 dark:text-emerald-400",
              bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
              desc: "The ratio of correctly predicted positive observations to all observations in actual class.",
              formula: "TP / (TP + FN)",
              usage: "Critical for medical diagnosis."
            },
            {
              title: "F1-Score",
              subtitle: "Harmonic mean",
              icon: "functions",
              colorClass: "text-violet-600 dark:text-violet-400",
              bgClass: "bg-violet-100 dark:bg-violet-900/30",
              desc: "The weighted average of Precision and Recall. Takes both false positives and false negatives into account.",
              formula: "2 * (P * R) / (P + R)",
              usage: "Balanced metric for imbalanced data."
            },
            {
              title: "AUROC",
              subtitle: "Area Under ROC Curve",
              icon: "ssid_chart",
              colorClass: "text-amber-600 dark:text-amber-400",
              bgClass: "bg-amber-100 dark:bg-amber-900/30",
              desc: "Measures ability to distinguish between classes across all thresholds.",
              formula: "Integral of TPR vs FPR",
              usage: "Overall classifier quality."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                    <div className={`size-12 rounded-lg ${item.bgClass} ${item.colorClass} flex items-center justify-center`}>
                         <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{item.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wide">{item.subtitle}</p>
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed mb-4 min-h-[40px]">
                    {item.desc}
                </p>
                <div className="bg-gray-50 dark:bg-black/20 rounded p-2 font-mono text-xs text-slate-700 dark:text-gray-400 border border-gray-100 dark:border-gray-800/50 mb-3">
                    {item.formula}
                </div>
                 <div className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm mt-0.5">science</span>
                    <span>{item.usage}</span>
                 </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default MetricDefinitions;