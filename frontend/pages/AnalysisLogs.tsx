import React from 'react';
import { LogEntry } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalysisLogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

const AnalysisLogs: React.FC<AnalysisLogsProps> = ({ logs, onClear }) => {
  const { t } = useLanguage();

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('logs.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('logs.subtitle')}</p>
        </div>
        {logs.length > 0 && (
          <button 
            onClick={onClear}
            className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-bold border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            {t('live.clear')}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
           {logs.length === 0 ? (
               <div className="p-16 text-center flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 min-h-[400px]">
                   <div className="size-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-4xl opacity-50">history_toggle_off</span>
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('logs.empty')}</h3>
                   <p className="text-sm opacity-60 max-w-xs">{t('logs.empty_sub')}</p>
               </div>
           ) : (
               <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                       <thead className="bg-gray-50/50 dark:bg-black/10 text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider">
                           <tr>
                               <th className="p-4 border-b border-gray-100 dark:border-gray-800">{t('logs.col.time')}</th>
                               <th className="p-4 border-b border-gray-100 dark:border-gray-800">{t('logs.col.engine')}</th>
                               <th className="p-4 border-b border-gray-100 dark:border-gray-800">{t('logs.col.source')}</th>
                               <th className="p-4 border-b border-gray-100 dark:border-gray-800 text-center">{t('logs.col.signal')}</th>
                               <th className="p-4 border-b border-gray-100 dark:border-gray-800">{t('logs.col.metrics')}</th>
                               <th className="p-4 border-b border-gray-100 dark:border-gray-800 text-right">{t('logs.col.pred')}</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                           {logs.map((log) => (
                               <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                   <td className="p-4 whitespace-nowrap">
                                       <div className="flex items-center gap-3">
                                           <div className={`size-8 rounded-lg flex items-center justify-center ${log.source === 'upload' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
                                               <span className="material-symbols-outlined text-lg">{log.source === 'upload' ? 'upload_file' : 'mic'}</span>
                                           </div>
                                           <div>
                                               <p className="font-bold text-slate-900 dark:text-white">{log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                               <p className="text-[10px] text-slate-500">{log.timestamp.toLocaleDateString()}</p>
                                           </div>
                                       </div>
                                   </td>
                                   <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">memory</span>
                                            <span className="font-bold text-slate-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{log.modelName}</span>
                                        </div>
                                   </td>
                                   <td className="p-4">
                                        <p className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]" title={log.fileName}>{log.fileName}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 font-mono">{log.duration}</p>
                                   </td>
                                   <td className="p-4 text-center">
                                        <div className="inline-flex gap-2">
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono text-slate-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{log.signal.format}</span>
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono text-slate-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{log.signal.bitDepth}</span>
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono text-slate-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{log.signal.sampleRate}Hz</span>
                                        </div>
                                   </td>
                                   <td className="p-4">
                                       <div className="flex gap-4 text-xs">
                                           <div>
                                               <span className="text-[10px] text-slate-400 uppercase font-bold block">Jitter</span>
                                               <span className="font-mono text-slate-700 dark:text-gray-300 font-semibold">{log.result.features.jitter}</span>
                                           </div>
                                           <div>
                                               <span className="text-[10px] text-slate-400 uppercase font-bold block">Shimmer</span>
                                               <span className="font-mono text-slate-700 dark:text-gray-300 font-semibold">{log.result.features.shimmer}</span>
                                           </div>
                                           <div>
                                               <span className="text-[10px] text-slate-400 uppercase font-bold block">HNR</span>
                                               <span className="font-mono text-slate-700 dark:text-gray-300 font-semibold">{log.result.features.hnr}</span>
                                           </div>
                                       </div>
                                   </td>
                                   <td className="p-4 text-right">
                                       <div className="flex flex-col items-end">
                                           <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase mb-1 ${log.result.label === 'Dysarthric' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                               {log.result.label === 'Dysarthric' ? t('gen.dysarthric') : t('gen.non_dysarthric')}
                                           </span>
                                           <span className="text-xs text-slate-500">
                                               {t('live.conf')}: <b className="text-slate-900 dark:text-white">{(log.result.confidence * 100).toFixed(1)}%</b> • {
                                                    log.result.severity === 'High' ? t('gen.high') :
                                                    log.result.severity === 'Mid' ? t('gen.mid') :
                                                    log.result.severity === 'Low' ? t('gen.low') : t('gen.none')
                                               }
                                           </span>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           )}
      </div>
    </div>
  );
};

export default AnalysisLogs;