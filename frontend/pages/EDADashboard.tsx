import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- TYPE DEFINITIONS ---
type DatasetKey = 'torgo' | 'uaspeech';

type AudioFile = {
    id: string;
    name: string;
    duration: string;
    durationSec: number;
    type: 'dysarthric' | 'control';
    severity?: string;
    waveform?: number[]; // Real data
    spectrogram?: number[][]; // Real data
    url?: string; // Real URL
    filename?: string;
};

type AudioPair = {
    id: string; // unique ID for the pair
    word: string;
    control: AudioFile;
    dysarthric: AudioFile;
};

type SummaryTableRow = {
    category: string;
    speakers: number;
    totalRaw: number;
    trainRaw: number;
    testRaw: number;
};

type DatasetSpecs = {
    format: string;
    sampleRate: string;
    bitDepth: string;
    channels: string;
    byteRate: string;
};

type DatasetConfig = {
    name: string;
    description: string;
    stats: { samples: string; classes: string; avgLen: string };
    specs: DatasetSpecs;
    summaryData: SummaryTableRow[];
    pairs: AudioPair[];
};

// --- MOCK DATA CONFIGURATION (Fallback) ---
const DATASETS: Record<DatasetKey, DatasetConfig> = {
    torgo: {
        name: 'TORGO_DB_v2',
        description: 'Dysarthric articulation of head-and-neck cancer patients.',
        stats: { samples: '-', classes: '-', avgLen: '-' },
        specs: { format: '.wav', sampleRate: '16000 Hz', bitDepth: '16-bit', channels: '1 (Mono)', byteRate: '31 KB/s' },
        summaryData: [],
        pairs: []
    },
    uaspeech: {
        name: 'UASpeech_Isolated',
        description: 'Isolated word recognition for cerebral palsy speakers.',
        stats: { samples: '-', classes: '-', avgLen: '-' },
        specs: { format: '.wav', sampleRate: '16000 Hz', bitDepth: '16-bit', channels: '1 (Mono)', byteRate: '31 KB/s' },
        summaryData: [],
        pairs: []
    }
};

const EDADashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeDataset, setActiveDataset] = useState<DatasetKey>('uaspeech');
    const [datasets, setDatasets] = useState<Record<DatasetKey, DatasetConfig>>(DATASETS);
    const [selectedPair, setSelectedPair] = useState<AudioPair | null>(null);

    // Playback State
    const [playingType, setPlayingType] = useState<'none' | 'control' | 'dysarthric'>('none');
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRefControl = useRef<HTMLCanvasElement | null>(null);
    const canvasRefDys = useRef<HTMLCanvasElement | null>(null);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchAll = async () => {
            try {
                console.log('🔍 Fetching EDA samples from backend...');
                const resSamples = await fetch('/api/dataset/eda-samples');
                const samplesJson = await resSamples.json();
                console.log('✅ Received data:', samplesJson);

                setDatasets(prev => {
                    const next = { ...prev };

                    const mapFile = (f: any, type: 'control' | 'dysarthric'): AudioFile => ({
                        id: f.filename,
                        name: f.filename,
                        filename: f.filename,
                        duration: f.duration.toString() + 's',
                        durationSec: f.duration,
                        type: type,
                        waveform: f.waveform,
                        spectrogram: f.spectrogram,
                        url: `/static/samples/${f.filename}`
                    });

                    const processPairs = (items: any[], key: DatasetKey) => {
                        if (!Array.isArray(items)) return;

                        const pairs: AudioPair[] = items.map((item: any, idx: number) => ({
                            id: `${key}-pair-${idx}`,
                            word: item.word || 'Unknown',
                            control: mapFile(item.control, 'control'),
                            dysarthric: mapFile(item.dysarthric, 'dysarthric')
                        }));

                        next[key].pairs = pairs;

                        // Stats
                        const totalSamples = pairs.length * 2;
                        next[key].stats.samples = totalSamples.toString();
                        next[key].stats.classes = "2";
                        // Calc avg len
                        const totalDur = pairs.reduce((acc, p) => acc + p.control.durationSec + p.dysarthric.durationSec, 0);
                        next[key].stats.avgLen = totalSamples > 0 ? (totalDur / totalSamples).toFixed(2) + 's' : '0s';

                        // Hardcoded Summary Data from User Request
                        if (key === 'uaspeech') {
                            next[key].summaryData = [
                                { category: 'Dysarthric', speakers: 8, totalRaw: 5600, trainRaw: 4480, testRaw: 1120 },
                                { category: 'Non-Dysarthric', speakers: 8, totalRaw: 5610, trainRaw: 4488, testRaw: 1122 },
                                { category: 'Total', speakers: 16, totalRaw: 11210, trainRaw: 8968, testRaw: 2242 }
                            ];
                        } else if (key === 'torgo') {
                            next[key].summaryData = [
                                { category: 'Dysarthric', speakers: 8, totalRaw: 1000, trainRaw: 800, testRaw: 200 },
                                { category: 'Non-Dysarthric', speakers: 7, totalRaw: 1000, trainRaw: 800, testRaw: 200 },
                                { category: 'Total', speakers: 15, totalRaw: 2000, trainRaw: 1600, testRaw: 400 }
                            ];
                        }
                    };

                    processPairs(samplesJson.torgo, 'torgo');
                    processPairs(samplesJson.uaspeech, 'uaspeech');

                    return next;
                });
            } catch (e) {
                console.error("❌ Failed to load EDA data:", e);
            }
        };
        fetchAll();
    }, []);

    // Set initial selection
    useEffect(() => {
        const currentPairs = datasets[activeDataset].pairs;
        if (currentPairs.length > 0 && !selectedPair) {
            setSelectedPair(currentPairs[0]);
        }
    }, [datasets, activeDataset]);

    // --- HANDLERS ---
    const handleDatasetChange = (ds: DatasetKey) => {
        setActiveDataset(ds);
        setSelectedPair(null);
        setPlayingType('none');
    };

    const handlePairSelect = (pair: AudioPair) => {
        setSelectedPair(pair);
        setPlayingType('none');
    };

    const togglePlay = (type: 'control' | 'dysarthric') => {
        if (playingType === type) {
            setPlayingType('none'); // Pause
        } else {
            setPlayingType(type); // Play new
        }
    };

    // --- AUDIO LOGIC ---
    // Handle switching audio source when playingType changes or selectedPair changes
    useEffect(() => {
        // Stop any current audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            setCurrentTime(0);
        }

        if (playingType === 'none' || !selectedPair) return;

        const file = playingType === 'control' ? selectedPair.control : selectedPair.dysarthric;
        const url = file.url ? `/api${file.url}` : "";

        if (url) {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
            audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
            audio.addEventListener('ended', () => setPlayingType('none'));

            audio.play().catch(e => {
                console.warn("Autoplay blocked", e);
                setPlayingType('none');
            });
        }

        return () => {
            if (audioRef.current) audioRef.current.pause();
        };
    }, [playingType, selectedPair]);

    // --- SPECTROGRAM RENDERER ---
    const renderSpectrogram = (canvas: HTMLCanvasElement | null, file: AudioFile) => {
        if (!canvas || !file.spectrogram) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const spec = file.spectrogram;
        if (!spec || spec.length === 0 || !spec[0]) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const nFreqs = spec.length;
        const nTime = spec[0].length;
        const cellWidth = width / nTime;
        const cellHeight = height / nFreqs;

        for (let t = 0; t < nTime; t++) {
            for (let f = 0; f < nFreqs; f++) {
                const val = spec[f][t] || 0;
                // Magma approximation
                let r, g, b;
                if (val < 0.5) {
                    const p = val * 2;
                    r = p * 120; g = p * 20; b = p * 120;
                } else {
                    const p = (val - 0.5) * 2;
                    r = 120 + p * 135; g = 20 + p * 235; b = 120 - p * 120;
                }
                const y = height - (f + 1) * cellHeight;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(t * cellWidth, y, cellWidth + 0.5, cellHeight + 0.5);
            }
        }
    };

    useEffect(() => {
        if (selectedPair) {
            renderSpectrogram(canvasRefControl.current, selectedPair.control);
            renderSpectrogram(canvasRefDys.current, selectedPair.dysarthric);
        }
    }, [selectedPair]);


    // --- RENDER HELPERS ---
    const renderSignalCard = (type: 'control' | 'dysarthric') => {
        if (!selectedPair) return null;
        const file = type === 'control' ? selectedPair.control : selectedPair.dysarthric;
        const isThisPlaying = playingType === type;
        const colorClass = type === 'control' ? 'bg-emerald-500' : 'bg-red-500';
        const bgClass = type === 'control' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10';
        const borderClass = type === 'control' ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800';
        const textClass = type === 'control' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';

        const waveform = file.waveform || Array(60).fill(0);

        // Progress bar only if THIS file is playing
        const showProgress = isThisPlaying;
        const progressPct = (duration > 0 && showProgress) ? (currentTime / duration) * 100 : 0;

        return (
            <div className={`p-4 rounded-xl border ${bgClass} ${borderClass} flex flex-col gap-4 relative overflow-hidden transition-all`}>
                <div className="flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase text-white ${colorClass}`}>
                            {type === 'control' ? 'Control' : 'Dysarthric'}
                        </div>
                        <span className={`text-xs font-bold ${textClass}`} title={file.filename}>
                            {file.filename}
                        </span>
                    </div>
                </div>

                {/* Waveform Area */}
                <div className="flex items-center gap-4 z-10">
                    <button
                        onClick={() => togglePlay(type)}
                        className={`size-10 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-105 ${isThisPlaying ? colorClass + ' text-white' : 'bg-white dark:bg-card-dark text-slate-700 dark:text-white'}`}
                    >
                        <span className="material-symbols-outlined">{isThisPlaying ? 'pause' : 'play_arrow'}</span>
                    </button>

                    <div className="flex-1 h-16 flex items-center gap-[1px] relative">
                        {waveform.map((height, i) => (
                            <div key={i} className={`flex-1 rounded-full ${colorClass} opacity-80`} style={{ height: `${height}%` }}></div>
                        ))}
                        {showProgress && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all linear" style={{ left: `${progressPct}%` }}></div>
                        )}
                    </div>
                </div>

                {/* Spectrogram Mini */}
                <div className="h-24 w-full bg-black rounded-lg overflow-hidden relative border border-gray-800/50 z-10">
                    <canvas
                        ref={type === 'control' ? canvasRefControl : canvasRefDys}
                        width={300}
                        height={80}
                        className="w-full h-full object-cover opacity-90"
                    />
                    {showProgress && (
                        <div className="absolute top-0 bottom-0 w-[1px] bg-white/70" style={{ left: `${progressPct}%` }}></div>
                    )}
                </div>
            </div>
        );
    };

    const currentData = datasets[activeDataset];
    const currentPairs = currentData.pairs;

    return (
        <div className="p-6 md:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Paired Signal Analysis</h1>
                    <p className="text-slate-500 dark:text-gray-400">Compare Control vs Dysarthric audio samples.</p>
                </div>
                {/* Dataset Selector */}
                <div className="flex items-center gap-3 bg-white dark:bg-card-dark p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400 pl-2 uppercase tracking-wider hidden sm:block">Dataset:</span>
                    <select
                        value={activeDataset}
                        onChange={(e) => handleDatasetChange(e.target.value as DatasetKey)}
                        className="bg-gray-50 dark:bg-[#151b26] border-none text-sm font-bold text-slate-900 dark:text-white rounded focus:ring-2 focus:ring-primary cursor-pointer py-1.5 pl-3 pr-8"
                    >
                        <option value="torgo">TORGO (Paired)</option>
                        <option value="uaspeech">UASpeech (Paired)</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards Row (Moved to Top) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between px-6">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Samples</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{currentData.stats.samples}</p>
                    </div>
                    <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <span className="material-symbols-outlined">library_music</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between px-6">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Classes</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{currentData.stats.classes}</p>
                            <span className="text-xs font-mono text-gray-400">(Con/Dys)</span>
                        </div>
                    </div>
                    <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <span className="material-symbols-outlined">category</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between px-6">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Avg Duration</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{currentData.stats.avgLen}</p>
                    </div>
                    <div className="size-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <span className="material-symbols-outlined">timer</span>
                    </div>
                </div>
            </div>

            {/* Main Content: List & Visuals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[600px] min-h-[500px]">
                {/* LIST COLUMN (Scrollable) */}
                <div className="lg:col-span-4 flex flex-col bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden h-[500px] lg:h-full">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#151b26] flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white">Sample Pairs</h3>
                        <span className="text-xs font-mono bg-white dark:bg-black/20 px-2 py-0.5 rounded text-gray-500">{currentPairs.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        {currentPairs.length === 0 && <div className="text-center p-8 text-gray-400 text-sm">No samples found.</div>}

                        {currentPairs.map(pair => (
                            <button
                                key={pair.id}
                                onClick={() => handlePairSelect(pair)}
                                className={`w-full p-3 rounded-lg border text-left transition-all group flex flex-col gap-1 ${selectedPair?.id === pair.id
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex justify-between items-center w-full">
                                    <span className={`font-bold ${selectedPair?.id === pair.id ? 'text-primary' : 'text-slate-700 dark:text-white'}`}>
                                        Word: "{pair.word}"
                                    </span>
                                    {selectedPair?.id === pair.id && <span className="text-[10px] bg-primary text-white px-1.5 rounded">ACTIVE</span>}
                                </div>
                                <div className="flex gap-2 text-[10px] text-gray-500 font-mono mt-1">
                                    <span className={`px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`}>Con: {pair.control.duration}</span>
                                    <span className={`px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>Dys: {pair.dysarthric.duration}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* VISUALS COLUMN */}
                <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-y-auto pr-1">
                    {/* Control Card */}
                    {renderSignalCard('control')}
                    {/* Dysarthric Card */}
                    {renderSignalCard('dysarthric')}

                    {!selectedPair && (
                        <div className="h-full flex items-center justify-center text-gray-400 italic rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                            Select a pair from the list to examine signals
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row: Specs & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dataset Summary Table */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4">Dataset Distribution</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold">
                                    <th className="pb-3 pr-2">Sub-Class</th>
                                    <th className="pb-3 px-2 text-right">Unique Speakers</th>
                                    <th className="pb-3 px-2 text-right">Samples</th>
                                    <th className="pb-3 px-2 text-right">Train/Test Est.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                {currentData.summaryData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 pr-2 font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                                            <div className={`size-2 rounded-full ${row.category === 'Control' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            {row.category}
                                        </td>
                                        <td className="py-3 px-2 text-right font-mono text-slate-500">{row.speakers}</td>
                                        <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">{row.totalRaw}</td>
                                        <td className="py-3 px-2 text-right font-mono text-xs text-slate-500">{row.trainRaw} / {row.testRaw}</td>
                                    </tr>
                                ))}
                                {currentData.summaryData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-4 text-center text-xs text-gray-500 italic">No summary data available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Technical Specifications */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400">settings_voice</span>
                        Audio Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-y-5 gap-x-2 text-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider">File Format</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white bg-gray-50 dark:bg-white/5 px-2 py-1 rounded w-fit">{currentData.specs.format}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider">Sample Rate</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white bg-gray-50 dark:bg-white/5 px-2 py-1 rounded w-fit">{currentData.specs.sampleRate}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider">Bit Depth</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white bg-gray-50 dark:bg-white/5 px-2 py-1 rounded w-fit">{currentData.specs.bitDepth}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider">Channels</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white bg-gray-50 dark:bg-white/5 px-2 py-1 rounded w-fit">{currentData.specs.channels}</span>
                        </div>
                        <div className="flex flex-col gap-1 col-span-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider">Byte Rate</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{currentData.specs.byteRate}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EDADashboard;