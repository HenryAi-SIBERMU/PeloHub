import React, { useState, useEffect, useMemo } from 'react';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { useNavigate } from 'react-router-dom';

// --- HELPER HOOK (Similar to ModelEvaluation) ---
const useEvaluationData = () => {
    // Use same cache key as ModelEvaluation to share data
    return useCachedFetch('/api/evaluation/details', 'EVALUATION_CACHE_V2');
};

const TrainingEfficiency: React.FC = () => {
    const navigate = useNavigate();
    const { data, loading } = useEvaluationData();

    // --- DATA PROCESSING ---
    const processed = useMemo(() => {
        if (loading || !data || !data.summary || data.summary.length === 0) return null;

        // Group by model (averaging if multiple datasets, or taking max)
        // Let's take the first occurrence or max for 'training_time_sec'
        const models: Record<string, any> = {};

        data.summary.forEach((entry: any) => {
            const mKey = entry.model;
            if (!models[mKey]) {
                models[mKey] = {
                    key: mKey,
                    name: entry.model, // Can refine name mapping later
                    time: entry.training_time_sec,
                    acc: entry.accuracy,
                    params: data.efficiency?.[mKey]?.params || 'N/A',
                    isWinner: false
                };
            } else {
                // If multiple datasets, maybe sum time? 
                // "Total Training" usually means sum across datasets if sequential
                models[mKey].time += entry.training_time_sec;
                // Average accuracy
                models[mKey].acc = (models[mKey].acc + entry.accuracy) / 2;
            }
        });

        const modelList = Object.values(models);
        if (modelList.length === 0) return null;

        // Find min/max
        modelList.sort((a, b) => a.time - b.time); // Ascending time
        const winner = modelList[0];
        const loser = modelList[modelList.length - 1];

        winner.isWinner = true;

        const speedup = loser.time / winner.time;
        const timeSavedSec = loser.time - winner.time;

        // Format functions
        const fmtTime = (sec: number) => {
            if (sec < 60) return `${sec.toFixed(0)}s`;
            const m = Math.floor(sec / 60);
            const s = (sec % 60).toFixed(0);
            if (m < 60) return `${m}m ${s}s`;
            const h = Math.floor(m / 60);
            const remM = m % 60;
            return `${h}h ${remM}m`;
        };

        return {
            models: modelList,
            winner,
            loser,
            speedup: speedup.toFixed(1),
            timeSaved: fmtTime(timeSavedSec),
            fmtTime
        };
    }, [data, loading]);

    // --- SKELETON DATA (Used when loading or no data) ---
    const skeletonProcessed = {
        models: [
            { key: 's1', name: 'Loading Model A...', time: 100, acc: 0, params: '...', isWinner: false },
            { key: 's2', name: 'Loading Model B...', time: 80, acc: 0, params: '...', isWinner: false },
            { key: 's3', name: 'Loading Model C...', time: 60, acc: 0, params: '...', isWinner: false }
        ],
        winner: { name: 'Loading...', isWinner: true },
        loser: { name: '...', time: 100 },
        speedup: '...',
        timeSaved: '...',
        fmtTime: () => '...'
    };

    const displayData = (processed && !loading) ? processed : skeletonProcessed;
    const { models, winner, speedup, timeSaved, fmtTime } = displayData;
    const isSkeleton = loading || !processed;

    return (
        <div className="p-6 md:p-8 flex flex-col gap-6 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Training Efficiency Benchmarks</h1>
                <div className="relative">
                    <button disabled={isSkeleton} className="flex items-center gap-2 text-sm font-medium text-primary bg-white dark:bg-card-dark border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors shadow-sm disabled:opacity-50">
                        <span>{isSkeleton ? 'Loading...' : 'Latest Run'}</span>
                        <span className="material-symbols-outlined text-base">expand_more</span>
                    </button>
                </div>
            </div>

            {/* Hero Card */}
            <div className={`bg-white dark:bg-card-dark rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group transition-all duration-500`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <span className="material-symbols-outlined text-xl">bolt</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Efficiency Winner</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
                            {isSkeleton ? <span className="bg-slate-200 dark:bg-slate-700 rounded px-2">...</span> : speedup}x Faster Training
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-gray-400 leading-relaxed max-w-lg">
                            The <span className="text-slate-900 dark:text-white font-medium">{winner.name}</span> model completes training significantly faster, maintaining high accuracy.
                        </p>
                    </div>
                    <div className="flex items-center justify-center md:justify-end">
                        <div className="text-center px-6 py-4 bg-green-500/10 rounded-xl border border-green-500/20">
                            <p className="text-sm font-bold text-green-600 dark:text-green-400 uppercase">Total Time Saved</p>
                            <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">{isSkeleton ? '...' : timeSaved}</p>
                            <p className="text-xs text-gray-500 mt-1">Vs Slowest Model</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className={`lg:col-span-2 bg-white dark:bg-card-dark rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Duration Comparison</h3>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lower is Better</span>
                    </div>

                    <div className="flex flex-col gap-5 justify-center min-h-[300px]">
                        {models.map((m: any, idx: number) => {
                            // Width relative to slowest (max time)
                            const slowest = isSkeleton ? models[0] : displayData.loser;
                            const pct = isSkeleton ? (idx + 1) * 20 + 20 : Math.max(5, (m.time / slowest.time) * 100);

                            return (
                                <div key={idx} className="flex flex-col gap-1 w-full group">
                                    <div className="flex justify-between items-end mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${m.isWinner ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {m.name}
                                            </span>
                                            {m.isWinner && !isSkeleton && <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">WINNER</span>}
                                        </div>
                                        <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">{isSkeleton ? '...' : fmtTime(m.time)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-8 overflow-hidden relative">
                                        <div
                                            className={`h-full rounded-full flex items-center px-3 transition-all duration-1000 ${m.isWinner && !isSkeleton ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            style={{ width: `${pct}%` }}
                                        >
                                            <span className="text-[10px] font-bold text-white/90 whitespace-nowrap drop-shadow-md">{pct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stats Column */}
                <div className="flex flex-col gap-4">
                    {models.map((m: any, idx: number) => (
                        <div key={idx} className={`bg-white dark:bg-card-dark p-6 rounded-xl border shadow-sm relative overflow-hidden transition-all duration-500 ${isSkeleton ? 'border-gray-100 dark:border-gray-800' : (m.isWinner ? 'border-primary/30' : 'border-gray-100 dark:border-gray-800 opacity-90')}`}>
                            {m.isWinner && !isSkeleton && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>}
                            <h4 className="font-bold text-slate-900 dark:text-white truncate">{m.name}</h4>
                            <div className="flex items-center gap-2 mt-1 mb-4">
                                <span className={`text-xs px-2 py-0.5 rounded ${isSkeleton ? 'bg-slate-200 dark:bg-slate-700 text-transparent' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{m.isWinner ? 'Best Choice' : 'Baseline'}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${isSkeleton ? 'bg-slate-200 dark:bg-slate-700 text-transparent' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>{m.params ? m.params : '?'} Params</span>
                            </div>
                            <div className="flex justify-between items-end border-t border-gray-100 dark:border-gray-800 pt-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Training Time</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{isSkeleton ? '...' : fmtTime(m.time)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase">Accuracy</p>
                                    <p className={`text-xl font-bold ${m.isWinner && !isSkeleton ? 'text-emerald-500' : 'text-slate-700 dark:text-gray-300'}`}>
                                        {isSkeleton ? '...' : (m.acc * 100).toFixed(1) + '%'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TrainingEfficiency;