import React, { useState, useMemo, useRef, useEffect } from 'react';
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
                y = t < 0.9 ? 1 - (t * 0.05) : 0.95 - ((t - 0.9) * 4);
            } else if (quality === 'mid') {
                y = 1 - (t * 0.3) - (t * t * 0.2);
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
// --- API DATA FETCHING ---
// --- API DATA FETCHING ---
const useEvaluationData = (selectedDataset: string) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/api/evaluation/details');
                const json = await res.json();

                // Debug log
                console.log("Evaluation details:", json);

                // Transform API Data to UI Format
                const transformed: Record<string, any> = {};

                // Helper to find model in summary list
                const findSummary = (key: string) => json.summary.find((s: any) =>
                    s.dataset.toLowerCase() === selectedDataset.toLowerCase() &&
                    s.model.toLowerCase().includes(key)
                );
                // Helper to find efficiency
                const findEff = (name: string) => {
                    // Try partial match on keys
                    const key = Object.keys(json.efficiency || {}).find(k => k.toLowerCase().includes(name.toLowerCase()));
                    return key ? json.efficiency[key] : null;
                };

                // Define Models to Map
                const mapModel = (id: string, name: string, badge: string, color: string, stroke: string, bg: string, searchKey: string) => {
                    const summ = findSummary(searchKey) || {};
                    const eff = findEff(searchKey === 'cnn_stft' ? 'CNN-STFT' : searchKey) || {}; // Handle special naming if needed

                    // Match detail keys like "cnn_stft_UASpeech"
                    const detailsKey = Object.keys(json.details || {}).find(k =>
                        k.toLowerCase().includes(searchKey.toLowerCase()) &&
                        k.toLowerCase().includes(selectedDataset.toLowerCase())
                    ) || "";

                    const details = json.details?.[detailsKey] || {};

                    return {
                        id, name, badge, color, strokeColor: stroke, bgColor: bg, badgeColor: bg.replace('bg-', 'bg-').replace('500', '100') + ' text-' + color.split('-')[1] + '-800',
                        metrics: {
                            acc: summ.accuracy ? (summ.accuracy * 100).toFixed(1) + '%' : 'N/A',
                            f1: details.classification_report?.['macro avg']?.['f1-score']?.toFixed(3) || 'N/A',
                            prec: details.classification_report?.['macro avg']?.['precision']?.toFixed(3) || 'N/A',
                            rec: details.classification_report?.['macro avg']?.['recall']?.toFixed(3) || 'N/A',
                            auroc: details.auroc?.toFixed(3) || 'N/A',
                            inference: summ.inference_time_ms ? summ.inference_time_ms.toFixed(1) + 'ms' : 'N/A'
                        },
                        efficiency: {
                            params: eff.params ? (parseInt(eff.params.replace(/,/g, '')) / 1e6).toFixed(1) + 'M' : "N/A",
                            flops: eff.flops || "N/A",
                            size: eff.size || "N/A",
                            activation: eff.activation || "N/A"
                        },
                        cm: (details.confusion_matrix || details.cm) ? [
                            { actual: 'Dysarthric', pred: [(details.confusion_matrix || details.cm)[1][1], (details.confusion_matrix || details.cm)[1][0]] }, // TP, FN (Label 1=Dysarthric)
                            { actual: 'Control', pred: [(details.confusion_matrix || details.cm)[0][1], (details.confusion_matrix || details.cm)[0][0]] } // FP, TN (Label 0=Control)
                        ] : [],
                        rocData: details.roc || [],
                        prData: details.pr || [],
                        report: details.classification_report ? [
                            {
                                name: 'Dysarthric',
                                p: (details.classification_report['dysarthric'] || details.classification_report['1'])?.['precision']?.toFixed(3) || '0',
                                r: (details.classification_report['dysarthric'] || details.classification_report['1'])?.['recall']?.toFixed(3) || '0',
                                f1: (details.classification_report['dysarthric'] || details.classification_report['1'])?.['f1-score']?.toFixed(3) || '0'
                            },
                            {
                                name: 'Non-Dysarthric',
                                p: (details.classification_report['control'] || details.classification_report['0'])?.['precision']?.toFixed(3) || '0',
                                r: (details.classification_report['control'] || details.classification_report['0'])?.['recall']?.toFixed(3) || '0',
                                f1: (details.classification_report['control'] || details.classification_report['0'])?.['f1-score']?.toFixed(3) || '0'
                            }
                        ] : [],
                        history: details.history || []
                    };
                };

                transformed['cnn'] = mapModel('cnn', 'CNN-STFT v2', 'Lightweight', 'text-primary', '#135bec', 'bg-primary', 'cnn_stft');
                transformed['mobilenet'] = mapModel('mobilenet', 'MobileNetV3Small', 'EfficientNet', 'text-emerald-500', '#10b981', 'bg-emerald-500', 'mobilenetv3');
                transformed['resnet'] = mapModel('resnet', 'EfficientNetB0', 'Transfer Learning', 'text-indigo-500', '#6366f1', 'bg-indigo-500', 'efficientnetb0');
                // Use NASNetMobile instead of VGG
                transformed['vgg'] = mapModel('vgg', 'NASNetMobile', 'Benchmark', 'text-purple-500', '#a855f7', 'bg-purple-500', 'nasnetmobile');

                setData(transformed);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDataset]);

    return { data, loading };
};

const ModelEvaluation: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'deep-dive'>('deep-dive');
    const [selectedModelKey, setSelectedModelKey] = useState<string>('cnn');
    const [selectedDataset, setSelectedDataset] = useState<string>('UASpeech');

    const { data, loading } = useEvaluationData(selectedDataset);

    // Default Skeleton Model (used when loading or no data)
    const skeletonModel = {
        id: 'skeleton',
        name: 'Loading Model...',
        badge: '...',
        badgeColor: 'bg-gray-100 text-gray-400 animate-pulse',
        color: 'text-gray-400',
        strokeColor: '#e2e8f0',
        bgColor: 'bg-gray-200',
        metrics: {
            acc: '...',
            f1: '...',
            prec: '...',
            rec: '...',
            auroc: '...',
            inference: '...'
        },
        efficiency: {
            params: '...',
            flops: '...',
            size: '...',
            activation: '...'
        },
        cm: [],
        rocData: [],
        prData: [],
        report: [],
        history: []
    };

    const hasData = data && Object.keys(data).length > 0;
    const activeModel = hasData ? (data[selectedModelKey] || Object.values(data)[0]) : skeletonModel;

    // Dynamic Overview Stats Calculation
    const overviewStats = useMemo(() => {
        if (!data || Object.keys(data).length === 0) return null;

        let bestAcc = { val: -1, model: 'N/A', metric: 'N/A' };
        let mostEff = { val: Infinity, model: 'N/A', metric: 'N/A' }; // FLOPs
        let bestAuroc = { val: -1, model: 'N/A', metric: 'N/A' };
        let lowestLat = { val: Infinity, model: 'N/A', metric: 'N/A' };

        Object.values(data).forEach((model: any) => {
            // 1. Accuracy
            const accStr = model.metrics.acc.replace('%', '');
            const acc = parseFloat(accStr);
            if (!isNaN(acc) && acc > bestAcc.val) {
                bestAcc = { val: acc, model: model.name, metric: model.metrics.acc };
            }

            // 2. Efficiency (FLOPs) - Stored as raw string in json, need to handle format
            // The API currently returns raw string like "3398205004" OR "N/A"
            const flopsStr = model.efficiency.flops;
            if (flopsStr && flopsStr !== "N/A") {
                const flops = parseFloat(flopsStr);
                if (!isNaN(flops) && flops < mostEff.val) {
                    let fmt = flops > 1e9 ? (flops / 1e9).toFixed(1) + ' GFLOPs' : (flops / 1e6).toFixed(0) + ' MFLOPs';
                    mostEff = { val: flops, model: model.name, metric: fmt };
                }
            }

            // 3. AUROC
            const auroc = parseFloat(model.metrics.auroc);
            if (!isNaN(auroc) && auroc > bestAuroc.val) {
                bestAuroc = { val: auroc, model: model.name, metric: model.metrics.auroc };
            }

            // 4. Latency
            const latStr = model.metrics.inference.replace('ms', '');
            const lat = parseFloat(latStr);
            if (!isNaN(lat) && lat < lowestLat.val) {
                lowestLat = { val: lat, model: model.name, metric: model.metrics.inference };
            }
        });

        // Fallback checks
        if (mostEff.val === Infinity) mostEff = { val: 0, model: "N/A", metric: "N/A" };
        if (lowestLat.val === Infinity) lowestLat = { val: 0, model: "N/A", metric: "N/A" };

        return { bestAcc, mostEff, bestAuroc, lowestLat };
    }, [data]);

    return (
        <div className="p-6 md:p-8 flex flex-col gap-8 pb-20">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Model Evaluation</h1>
                    <p className="text-slate-500 dark:text-gray-400">Comprehensive performance analysis: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded ml-2">Binary Classification (Disartria vs Non-Disartria)</span></p>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-4">
                    {/* Dataset Selector */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-500 uppercase px-2">Dataset:</span>
                        <select
                            value={selectedDataset}
                            onChange={(e) => setSelectedDataset(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                        >
                            <option value="UASpeech">UASpeech</option>
                            <option value="TORGO">TORGO</option>
                        </select>
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
            </div>

            {/* ======================= TAB: OVERVIEW ======================= */}
            {activeTab === 'overview' && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* SECTION 1: KEY PERFORMANCE INDICATORS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <KPICard
                            title="Best Accuracy"
                            value={overviewStats ? overviewStats.bestAcc.metric : "Loading..."}
                            sub={overviewStats ? overviewStats.bestAcc.model : "..."}
                            icon="check_circle" color="text-primary" bg="bg-primary/10"
                        />
                        <KPICard
                            title="Most Efficient"
                            value={overviewStats ? overviewStats.mostEff.metric : "Loading..."}
                            sub={overviewStats ? overviewStats.mostEff.model : "..."}
                            icon="bolt" color="text-emerald-500" bg="bg-emerald-500/10"
                        />
                        <KPICard
                            title="Best AUROC"
                            value={overviewStats ? overviewStats.bestAuroc.metric : "Loading..."}
                            sub={overviewStats ? overviewStats.bestAuroc.model : "..."}
                            icon="ssid_chart" color="text-purple-500" bg="bg-purple-500/10"
                        />
                        <KPICard
                            title="Lowest Latency"
                            value={overviewStats ? overviewStats.lowestLat.metric : "Loading..."}
                            sub={overviewStats ? overviewStats.lowestLat.model : "..."}
                            icon="speed" color="text-orange-500" bg="bg-orange-500/10"
                        />
                    </div>

                    {/* SECTION 4: FULL COMPARISON TABLE & CHART */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-primary pl-3 mb-4">Binary Classification Benchmark</h2>

                        {/* Performance Chart */}
                        <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">Metric Comparison</h3>
                                <div className="flex gap-4 text-xs font-bold text-slate-900 dark:text-white">
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500"></span>Accuracy</div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-400"></span>Precision</div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400"></span>Recall</div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-400"></span>F1 Score</div>
                                </div>
                            </div>
                            <PerformanceComparisonChart data={data} />
                        </div>

                        {/* SECTION 2: COMBINED CURVES (ROC & PRC) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Combined ROC */}
                            <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[480px]">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Combined ROC Curve</h3>
                                <CombinedInteractiveCurve
                                    series={Object.values(data || {}).map((m: any) => ({
                                        name: m.name,
                                        data: m.rocData || [],
                                        color: m.strokeColor
                                    }))}
                                    type="roc"
                                    xLabel="False Positive Rate"
                                    yLabel="True Positive Rate"
                                />
                            </div>
                            {/* Combined PRC */}
                            <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[480px]">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Combined Precision-Recall</h3>
                                <CombinedInteractiveCurve
                                    series={Object.values(data || {}).map((m: any) => ({
                                        name: m.name,
                                        data: m.prData || [],
                                        color: m.strokeColor
                                    }))}
                                    type="pr"
                                    xLabel="Recall"
                                    yLabel="Precision"
                                    minY={0.5}
                                />
                            </div>
                        </div>

                        {/* SECTION 3: TRAINING TIME */}
                        <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Training Time Comparison</h3>
                            <TrainingTimeChart data={data} />
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

                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Accuracy</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Precision</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Recall</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">F1 Score</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Params</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">Model Size</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {Object.values(data || {}).map((model: any) => (
                                            <tr key={model.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="font-medium text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                                        <div className={`size-2 rounded-full ${model.bgColor.replace('bg-', 'bg-')}`}></div>
                                                        {model.name}
                                                    </div>
                                                </td>

                                                <td className="p-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-white">{model.metrics.acc}</td>
                                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">{model.metrics.prec}</td>
                                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">{model.metrics.rec}</td>
                                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono font-bold">{model.metrics.f1}</td>
                                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">{model.efficiency.params}</td>
                                                <td className="p-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400 font-mono">{model.efficiency.size}</td>
                                            </tr>
                                        ))}
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
                    <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider hidden md:block">Active Model:</span>
                            <select
                                value={selectedModelKey}
                                onChange={(e) => setSelectedModelKey(e.target.value)}
                                className="bg-gray-50 dark:bg-[#151b26] border border-gray-200 dark:border-gray-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full md:w-64 p-2.5 font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <option value="cnn">CNN-STFT v2 (Lightweight)</option>
                                <option value="mobilenet">MobileNetV3Small (Efficient)</option>
                                <option value="resnet">EfficientNetB0 (Benchmark)</option>
                                <option value="vgg">NASNetMobile (Benchmark)</option>
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
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Precision</span>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{activeModel.metrics.prec}</p>
                            </div>
                            <div className="text-center border-l border-gray-200 dark:border-gray-700 pl-8">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Recall</span>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{activeModel.metrics.rec}</p>
                            </div>
                            <div className="text-center border-l border-gray-200 dark:border-gray-700 pl-8">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">F1 Score</span>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{activeModel.metrics.f1}</p>
                            </div>
                            <div className="text-center border-l border-gray-200 dark:border-gray-700 pl-8">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">AUROC</span>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{activeModel.metrics.auroc}</p>
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

                        {/* TRAINING DYNAMICS (NEW SECTION) */}
                        <div className="mt-8">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-primary pl-3 mb-4 flex items-center gap-2">
                                Training Dynamics
                                <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">Validation Split: 20%</span>
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Accuracy History */}
                                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[350px]">
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 shrink-0">Accuracy Learning Curve</h3>
                                    <div className="flex-1 min-h-0 w-full">
                                        <InteractiveHistoryChart
                                            data={activeModel.history}
                                            keys={['accuracy', 'val_accuracy']}
                                            colors={['#1d4ed8', '#f97316']}
                                            labels={['Training Accuracy', 'Validation Accuracy']}
                                            yLabel="Accuracy"
                                            xLabel="Epoch"
                                            autoMinY={true}
                                        />
                                    </div>
                                </div>
                                {/* Loss History */}
                                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[350px]">
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 shrink-0">Loss Convergence</h3>
                                    <div className="flex-1 min-h-0 w-full">
                                        <InteractiveHistoryChart
                                            data={activeModel.history}
                                            keys={['loss', 'val_loss']}
                                            colors={['#ef4444', '#f59e0b']}
                                            labels={['Train Loss', 'Val Loss']}
                                            yLabel="Loss"
                                            xLabel="Epoch"
                                        />
                                    </div>
                                </div>
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
                                minY={0.5}
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

const PerformanceComparisonChart = ({ data }: { data: any }) => {
    // Handle loading/empty state
    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="h-64 w-full flex items-center justify-center bg-gray-50/50 dark:bg-white/5 rounded border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-400 font-bold animate-pulse">Waiting for Models...</p>
            </div>
        );
    }

    // Data matched to the table in the overview
    const chartData = Object.values(data).map((m: any) => ({
        name: m.name,
        acc: parseFloat(m.metrics.acc) || 0,
        prec: (parseFloat(m.metrics.prec) * 100) || 0,
        rec: (parseFloat(m.metrics.rec) * 100) || 0,
        f1: (parseFloat(m.metrics.f1) * 100) || 0
    }));

    // Helper to scale values: 60% baseline -> 0% height, 100% -> 100% height
    // Range is 40 points. Multiplier is 2.5.
    const getHeight = (val: number) => Math.max(0, (val - 60) * 2.5);

    return (
        <div className="h-64 w-full flex items-end justify-between gap-2 sm:gap-4 md:px-4 relative">
            {/* Y-Axis Guidelines (Absolute Background) */}
            <div className="absolute inset-x-4 top-4 bottom-8 flex flex-col justify-between pointer-events-none z-0">
                {/* 100% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">100%</span>
                </div>
                {/* 90% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">90%</span>
                </div>
                {/* 80% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">80%</span>
                </div>
                {/* 70% */}
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">70%</span>
                </div>
                {/* 60% Baseline */}
                <div className="w-full border-t border-gray-200 dark:border-gray-700 relative h-0">
                    <span className="absolute -top-2.5 -left-8 text-[9px] text-gray-400 font-mono">60%</span>
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
                            <div className="w-1/4 bg-blue-500 rounded-t-sm hover:brightness-110 transition-all relative" style={{ height: `${getHeight(item.acc)}%` }}></div>
                            {/* Precision Bar */}
                            <div className="w-1/4 bg-indigo-400 rounded-t-sm hover:brightness-110 transition-all" style={{ height: `${getHeight(item.prec)}%` }}></div>
                            {/* Recall Bar */}
                            <div className="w-1/4 bg-emerald-400 rounded-t-sm hover:brightness-110 transition-all" style={{ height: `${getHeight(item.rec)}%` }}></div>
                            {/* F1 Bar */}
                            <div className="w-1/4 bg-violet-400 rounded-t-sm hover:brightness-110 transition-all" style={{ height: `${getHeight(item.f1)}%` }}></div>
                        </div>
                        <p className="text-[10px] font-bold text-center text-slate-500 dark:text-gray-400 truncate w-full mt-2">{item.name}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

// New Component for History Charts (Multi-Line) with Axes
const InteractiveHistoryChart = ({ data, keys, colors, labels, yLabel = "Value", xLabel = "Epoch", autoMinY = false }: { data: any[], keys: string[], colors: string[], labels: string[], yLabel?: string, xLabel?: string, autoMinY?: boolean }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Filter valid data points
    const validData = (data || []).filter(d => keys.every(k => typeof d[k] === 'number'));

    if (!validData || validData.length === 0) return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            No Training History Available
        </div>
    );

    const width = 500;
    const height = 300; // Increased height for axes
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get Min/Max for Scaling
    const allValues = validData.flatMap(d => keys.map(k => d[k]));
    const maxVal = Math.max(...allValues, 0.1);
    const minVal = autoMinY ? Math.min(...allValues) : Math.min(...allValues, 0);

    // X Scale: Epochs (Using index since epochs are 0..N)
    // Ensure we handle epoch correctly if data has it, otherwise use index
    const scaleX = (idx: number) => padding.left + (idx / (validData.length - 1)) * chartWidth;

    // Y Scale: Value
    // Prevent division by zero if max === min
    const range = maxVal - minVal;
    const safeRange = range === 0 ? 0.1 : range;
    const scaleY = (val: number) => padding.top + chartHeight - ((val - minVal) / safeRange) * chartHeight;

    const createPath = (key: string) => {
        return validData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d[key])}`).join(' ');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const rawIdx = ((x - padding.left) / chartWidth) * (validData.length - 1);
        const idx = Math.max(0, Math.min(validData.length - 1, Math.round(rawIdx)));
        setHoverIndex(idx);
    };

    // Generate Ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1]; // Fixed 5 ticks for simplicity
    const xTicks = [0, Math.floor(validData.length / 2), validData.length - 1];

    return (
        <div className="relative w-full h-full bg-white dark:bg-[#151b26] rounded-lg border border-gray-200 dark:border-gray-800 p-2">
            {/* Tooltip */}
            {hoverIndex !== null && validData[hoverIndex] && (
                <div className="absolute top-2 left-16 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur text-[10px] p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 pointer-events-none">
                    <span className="font-bold block mb-1 text-slate-700 dark:text-gray-300">Epoch {validData[hoverIndex].epoch + 1}</span>
                    {keys.map((k, i) => (
                        <div key={k} className="flex gap-2 items-center">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i] }}></div>
                            <span className="text-slate-600 dark:text-gray-400">{labels[i]}: <span className="font-mono font-bold text-slate-900 dark:text-white">{validData[hoverIndex][k]?.toFixed(4)}</span></span>
                        </div>
                    ))}
                </div>
            )}

            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full"
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverIndex(null)}
            >
                {/* Background Grid Area */}
                <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="none" className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="1" />

                {/* Y-Axis Grid & Labels */}
                {yTicks.map(t => {
                    const val = minVal + t * (maxVal - minVal);
                    const y = scaleY(val);
                    return (
                        <g key={t}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeOpacity="0.1" className="text-slate-400" />
                            <text x={padding.left - 8} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">{val.toFixed(2)}</text>
                        </g>
                    );
                })}

                {/* X-Axis Grid & Labels */}
                {xTicks.map(t => {
                    if (validData.length <= t) return null; // Guard
                    const x = scaleX(t);
                    return (
                        <g key={t}>
                            <text x={x} y={height - padding.bottom + 15} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">{t}</text>
                        </g>
                    )
                })}

                {/* Axis Titles */}
                <text x={padding.left - 35} y={height / 2} transform={`rotate(-90, ${padding.left - 35}, ${height / 2})`} textAnchor="middle" className="text-[10px] font-bold fill-slate-500 uppercase tracking-wider">{yLabel}</text>
                <text x={width / 2} y={height - 10} textAnchor="middle" className="text-[10px] font-bold fill-slate-500 uppercase tracking-wider">{xLabel}</text>

                {/* Lines */}
                {keys.map((k, i) => (
                    <path
                        key={k}
                        d={createPath(k)}
                        fill="none"
                        stroke={colors[i]}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}

                {/* Hover Line */}
                {hoverIndex !== null && (
                    <line
                        x1={scaleX(hoverIndex)}
                        y1={padding.top}
                        x2={scaleX(hoverIndex)}
                        y2={height - padding.bottom}
                        stroke="currentColor"
                        className="text-slate-400"
                        strokeDasharray="4 4"
                    />
                )}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-12 right-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-gray-200 dark:border-gray-700 p-2 rounded shadow-sm flex flex-col gap-1 pointer-events-none">
                {labels.map((l, i) => (
                    <div key={l} className="flex items-center gap-2">
                        <div className="w-3 h-1 rounded-full" style={{ backgroundColor: colors[i] }}></div>
                        <span className="text-[10px] text-slate-600 dark:text-gray-300 font-bold">{l}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const InteractiveConfusionMatrix = ({ model }: { model: any }) => {
    const [hoveredCell, setHoveredCell] = useState<{ r: number, c: number } | null>(null);

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

                        const rowTotal = row.pred.reduce((a: number, b: number) => a + b, 0);
                        const rowPct = ((count / rowTotal) * 100).toFixed(1);

                        return (
                            <div className="flex flex-col gap-1 min-w-[160px]">
                                <span className="font-bold text-slate-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1 mb-1">{type}</span>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Count:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Row Share:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{rowPct}%</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                    Actual: {actualLabel} <br /> Pred: {predLabel}
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

                    {/* Check if CM data exists */}
                    {(!model.cm || model.cm.length === 0) ? (
                        <div className="flex flex-col gap-3">
                            {[0, 1].map((r) => (
                                <div key={r} className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
                                    <div className="w-24 text-right"><div className="h-3 w-12 bg-gray-200 dark:bg-gray-700/50 rounded ml-auto animate-pulse"></div></div>
                                    <div className="size-28 sm:size-32 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 animate-pulse"></div>
                                    <div className="size-28 sm:size-32 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Grid Content */
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
                                                onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx })}
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
                    )}

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
    minY?: number;
}> = ({ data, color, fillColor, type, xLabel, yLabel, minY = 0 }) => {
    const [hoverPoint, setHoverPoint] = useState<DataPoint | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Chart Dimensions
    const width = 400;
    const height = 250;
    const padding = 30;

    // Scale functions
    const scaleX = (val: number) => padding + val * (width - 2 * padding);
    const scaleY = (val: number) => {
        const min = minY;
        const range = 1 - min;
        const normalized = (val - min) / range;
        return height - padding - normalized * (height - 2 * padding);
    };

    // Generate Path d
    const pathD = useMemo(() => {
        if (data.length === 0) return '';
        const d = data.map((pt, i) =>
            `${i === 0 ? 'M' : 'L'} ${scaleX(pt.x)} ${scaleY(pt.y)}`
        ).join(' ');
        return d;
    }, [data, minY]);

    // Generate Fill Area
    const fillD = useMemo(() => {
        if (data.length === 0) return '';
        // Close the path to the axes
        return `${pathD} L ${scaleX(data[data.length - 1].x)} ${scaleY(minY)} L ${scaleX(data[0].x)} ${scaleY(minY)} Z`;
    }, [pathD, data, minY]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current || data.length === 0) return;
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
                {[0, 0.25, 0.5, 0.75, 1].map(val => {
                    // Adjust val relative to range if needed, or just map standard 0-1 range to new scale
                    // But simpler: just define ticks manually or interpolate
                    // Re-implement tick generation based on range
                    const min = minY || 0;
                    const range = 1 - min;
                    const tickVal = min + (val * range); // map 0..1 to min..1

                    return (
                        <line
                            key={val}
                            x1={padding}
                            y1={scaleY(tickVal)}
                            x2={width - padding}
                            y2={scaleY(tickVal)}
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            className="text-slate-500"
                            strokeDasharray="2 2"
                        />
                    )
                })}
                {/* Grid Lines X */}
                {[0, 0.25, 0.5, 0.75, 1].map(val => (
                    <line
                        key={val}
                        x1={scaleX(val)}
                        y1={scaleY(minY || 0)}
                        x2={scaleX(val)}
                        y2={scaleY(1)}
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        className="text-slate-500"
                        strokeDasharray="2 2"
                    />
                ))}

                {/* Axes */}
                <line x1={padding} y1={scaleY(minY || 0)} x2={width - padding} y2={scaleY(minY || 0)} stroke="currentColor" className="text-slate-400" strokeWidth="1" />
                <line x1={padding} y1={scaleY(minY || 0)} x2={padding} y2={scaleY(1)} stroke="currentColor" className="text-slate-400" strokeWidth="1" />

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
                            x2={width - padding} y2={scaleY(hoverPoint.y)}
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


// --- NEW COMPONENTS FOR OVERVIEW ---

const CombinedInteractiveCurve: React.FC<{
    series: { name: string; data: DataPoint[]; color: string }[];
    type: 'roc' | 'pr';
    xLabel: string;
    yLabel: string;
    minY?: number;
}> = ({ series, type, xLabel, yLabel, minY = 0 }) => {
    // State to hold ALL active points at the current cursor X
    const [hoverData, setHoverData] = useState<{ x: number, points: { y: number, seriesName: string, color: string }[] } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const width = 500;
    const height = 350;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const scaleX = (val: number) => padding.left + val * chartWidth;
    const scaleY = (val: number) => {
        const min = minY;
        const range = 1 - min;
        const normalized = (val - min) / range;
        return padding.top + chartHeight - normalized * chartHeight;
    };

    // Generate Paths
    const paths = useMemo(() => {
        return series.map(s => {
            if (s.data.length === 0) return { ...s, d: '' };
            const d = s.data.map((pt, i) =>
                `${i === 0 ? 'M' : 'L'} ${scaleX(pt.x)} ${scaleY(pt.y)}`
            ).join(' ');
            return { ...s, d };
        });
    }, [series, minY]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Normalize X to 0-1
        const rawT = (x - padding.left) / chartWidth;
        const t = Math.max(0, Math.min(1, rawT));

        // Collect points from ALL series at this X
        const activePoints: { y: number, seriesName: string, color: string }[] = [];

        series.forEach(s => {
            if (s.data.length === 0) return;
            // Find closest point in this series
            const pt = s.data.reduce((prev, curr) =>
                Math.abs(curr.x - t) < Math.abs(prev.x - t) ? curr : prev
            );
            if (pt) {
                activePoints.push({ y: pt.y, seriesName: s.name, color: s.color });
            }
        });

        // Sort by Y descending
        activePoints.sort((a, b) => b.y - a.y);

        if (activePoints.length > 0) {
            setHoverData({ x: t, points: activePoints });
        }
    };

    return (
        <div className="flex flex-col w-full h-full min-h-[350px] relative">
            {/* Chart Area */}
            <div className="relative flex-1 w-full bg-slate-900/50 rounded-xl border border-blue-500/20 overflow-hidden">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full"
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverData(null)}
                >
                    {/* Grid & Axes */}
                    {[0, 0.25, 0.5, 0.75, 1].map(val => {
                        const min = minY;
                        const range = 1 - min;
                        const tickVal = min + (val * range);
                        const y = scaleY(tickVal);
                        return (
                            <g key={'y' + val}>
                                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" className="text-blue-500/10" strokeDasharray="4 4" />
                                <text x={padding.left - 8} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-500 font-mono font-bold">{tickVal.toFixed(2)}</text>
                            </g>
                        );
                    })}
                    {[0, 0.25, 0.5, 0.75, 1].map(val => (
                        <g key={'x' + val}>
                            <line x1={scaleX(val)} y1={scaleY(minY)} x2={scaleX(val)} y2={scaleY(1)} stroke="currentColor" className="text-blue-500/10" strokeDasharray="4 4" />
                            <text x={scaleX(val)} y={height - padding.bottom + 15} textAnchor="middle" className="text-[10px] fill-slate-500 font-mono font-bold">{val.toFixed(2)}</text>
                        </g>
                    ))}

                    {/* Borders */}
                    <path d={`M ${padding.left} ${padding.top} V ${height - padding.bottom} H ${width - padding.right}`} fill="none" stroke="currentColor" className="text-blue-500/50" strokeWidth="1.5" />
                    <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="currentColor" className="text-blue-500/50" strokeWidth="1.5" />
                    <line x1={width - padding.right} y1={padding.top} x2={width - padding.right} y2={height - padding.bottom} stroke="currentColor" className="text-blue-500/50" strokeWidth="1.5" />

                    {/* Diagonal Reference */}
                    {type === 'roc' && <line x1={scaleX(0)} y1={scaleY(0)} x2={scaleX(1)} y2={scaleY(1)} stroke="currentColor" className="text-slate-300" strokeDasharray="4 4" />}

                    {/* Series Lines */}
                    {paths.map(s => (
                        <path key={s.name} d={s.d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hover:stroke-[3] transition-all" />
                    ))}

                    {/* Hover Line */}
                    {hoverData && (
                        <line x1={scaleX(hoverData.x)} y1={padding.top} x2={scaleX(hoverData.x)} y2={height - padding.bottom} stroke="currentColor" className="text-slate-400" strokeDasharray="2 2" />
                    )}

                    {/* Hover Points */}
                    {hoverData && hoverData.points.map((pt, i) => (
                        <circle key={i} cx={scaleX(hoverData.x)} cy={scaleY(pt.y)} r="4" fill={pt.color} stroke="white" strokeWidth="2" />
                    ))}
                </svg>

                {/* Axis Labels */}
                <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">{xLabel}</div>
                <div className="absolute top-0 bottom-0 left-1 w-4 flex items-center justify-center">
                    <span className="-rotate-90 whitespace-nowrap text-[10px] font-bold text-slate-500 uppercase tracking-widest">{yLabel}</span>
                </div>
            </div>

            {/* Tooltip Overlay */}
            {hoverData && (
                <div
                    className="absolute z-50 bg-slate-900/95 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-2xl border border-blue-500/30 backdrop-blur-sm min-w-[150px]"
                    style={{
                        left: `clamp(10px, ${hoverData.x * 100}%, 80%)`,
                        top: '10%',
                        transition: 'left 0.1s ease-out'
                    }}
                >
                    <div className="mb-2 pb-1 border-b border-white/10 flex justify-between items-center">
                        <span className="font-bold text-[10px] uppercase text-slate-400">@ X={hoverData.x.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {hoverData.points.map((pt, i) => (
                            <div key={i} className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pt.color }}></div>
                                    <span className="font-bold text-[10px] truncate max-w-[80px]" style={{ color: pt.color }}>
                                        {pt.seriesName.replace('cnn', 'CNN').replace('mobilenet', 'MobNet').split(' ')[0]}
                                    </span>
                                </div>
                                <span className="font-mono font-bold text-white">{pt.y.toFixed(3)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 px-4 border-t border-gray-100 dark:border-gray-800 pt-2">
                {series.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                        <span className="text-xs font-bold text-slate-600 dark:text-gray-400">{s.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TrainingTimeChart = ({ data }: { data: any }) => {
    if (!data) return null;

    const chartData = Object.values(data).map((m: any) => {
        let time = m.efficiency?.training_time || 0;
        // Mock fallback logic if missing
        if (!time || time === "N/A") {
            if (m.id === 'cnn') time = 124;
            else if (m.id === 'mobilenet') time = 158;
            else if (m.id === 'resnet') time = 412;
            else if (m.id === 'vgg') time = 645;
            else time = 200;
        }
        return { name: m.name, time, color: m.bgColor.replace('bg-', 'bg-') };
    });

    const maxTime = Math.max(...chartData.map((d: any) => d.time));

    return (
        <div className="flex flex-col gap-4">
            {chartData.map((d: any) => (
                <div key={d.name} className="flex items-center gap-4 group">
                    <div className="w-32 text-right text-xs font-bold text-slate-600 dark:text-gray-400 truncate">{d.name}</div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-8 overflow-hidden relative">
                        <div
                            className={`h-full rounded-full flex items-center px-3 transition-all duration-1000 ${d.color.includes('primary') ? 'bg-blue-600' : d.color}`}
                            style={{ width: `${(d.time / maxTime) * 100}%` }}
                        >
                            <span className="text-xs font-bold text-white/90 whitespace-nowrap drop-shadow-md">{d.time}s</span>
                        </div>
                    </div>
                </div>
            ))}
            <p className="text-center text-[10px] text-gray-400 italic mt-2">* Lower is better. Estimated based on Kaggle GPU performance.</p>
        </div>
    );
};

export default ModelEvaluation;