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
    files: Record<'dysarthric' | 'control', AudioFile[]>;
};

// --- MOCK DATA CONFIGURATION (Fallback) ---
const DATASETS: Record<DatasetKey, DatasetConfig> = {
    torgo: {
        name: 'TORGO_DB_v2',
        description: 'Dysarthric articulation of head-and-neck cancer patients.',
        stats: { samples: '-', classes: '-', avgLen: '-' },
        specs: { format: '.wav', sampleRate: '16000 Hz', bitDepth: '16-bit', channels: '1 (Mono)', byteRate: '31 KB/s' },
        summaryData: [],
        files: { dysarthric: [], control: [] }
    },
    uaspeech: {
        name: 'UASpeech_Isolated',
        description: 'Isolated word recognition for cerebral palsy speakers.',
        stats: { samples: '-', classes: '-', avgLen: '-' },
        specs: { format: '.wav', sampleRate: '16000 Hz', bitDepth: '16-bit', channels: '1 (Mono)', byteRate: '31 KB/s' },
        summaryData: [],
        files: { dysarthric: [], control: [] }
    }
};

const EDADashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeDataset, setActiveDataset] = useState<DatasetKey>('uaspeech');
    const [activeCategory, setActiveCategory] = useState<'dysarthric' | 'control'>('dysarthric');
    const [datasets, setDatasets] = useState<Record<DatasetKey, DatasetConfig>>(DATASETS);
    const [selectedFile, setSelectedFile] = useState<AudioFile | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchAll = async () => {
            try {
                console.log('🔍 Fetching EDA samples from backend...');
                // Fetch EDA Samples (audio files with waveform & spectrogram)
                const resSamples = await fetch('http://localhost:8000/api/dataset/eda-samples');
                const samplesJson = await resSamples.json();
                console.log('✅ Received data:', samplesJson);

                setDatasets(prev => {
                    const next = { ...prev };

                    // Merge Samples
                    if (samplesJson.torgo) {
                        console.log('📊 TORGO data:', samplesJson.torgo);
                        next.torgo.files = samplesJson.torgo;
                        // Update stats if available
                        if (samplesJson.torgo.dysarthric && samplesJson.torgo.control) {
                            const totalSamples = samplesJson.torgo.dysarthric.length + samplesJson.torgo.control.length;
                            next.torgo.stats.samples = totalSamples.toString();
                            next.torgo.stats.classes = '2';
                            console.log(`  TORGO: ${totalSamples} samples`);
                        }
                    }
                    if (samplesJson.uaspeech) {
                        console.log('📊 UASpeech data:', samplesJson.uaspeech);
                        next.uaspeech.files = samplesJson.uaspeech;
                        // Update stats if available
                        if (samplesJson.uaspeech.dysarthric && samplesJson.uaspeech.control) {
                            const totalSamples = samplesJson.uaspeech.dysarthric.length + samplesJson.uaspeech.control.length;
                            next.uaspeech.stats.samples = totalSamples.toString();
                            next.uaspeech.stats.classes = '2';
                            console.log(`  UASpeech: ${totalSamples} samples`);
                        }
                        // Update specs from first file if available
                        const firstFile = samplesJson.uaspeech.dysarthric[0] || samplesJson.uaspeech.control[0];
                        if (firstFile && firstFile.specs) {
                            next.uaspeech.specs = firstFile.specs;
                            console.log('  Audio specs updated:', firstFile.specs);
                        }
                    }

                    console.log('📦 Final merged data:', next);
                    return next;
                });
            } catch (e) {
                console.error("❌ Failed to load EDA data:", e);
            }
        };
        fetchAll();
    }, []);

    // Set initial selection once data loads
    useEffect(() => {
        const currentFiles = datasets[activeDataset].files[activeCategory];
        if (currentFiles.length > 0 && !selectedFile) {
            setSelectedFile(currentFiles[0]);
        }
    }, [datasets, activeDataset, activeCategory]); // Trigger when data updates

    const currentData = datasets[activeDataset];
    const fileList = currentData.files[activeCategory] || [];

    // --- HANDLERS ---
    const handleDatasetChange = (ds: DatasetKey) => {
        setActiveDataset(ds);
        setActiveCategory('dysarthric');
        setSelectedFile(null); // Will trigger effect above
        setIsPlaying(false);
    };

    const handleCategoryChange = (cat: 'dysarthric' | 'control') => {
        setActiveCategory(cat);
        setSelectedFile(null);
        setIsPlaying(false);
    };

    const handleFileSelect = (file: AudioFile) => {
        if (selectedFile?.id === file.id && isPlaying) {
            togglePlay();
        } else {
            setSelectedFile(file);
            setIsPlaying(true); // Auto-play new selection
        }
    };

    // --- AUDIO LOGIC ---
    useEffect(() => {
        if (!selectedFile) return;

        // Reset old audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }

        const url = selectedFile.url
            ? `http://localhost:8000${selectedFile.url}`
            : ""; // Fallback or empty if mock

        if (url) {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
            audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
            audio.addEventListener('ended', () => setIsPlaying(false));

            if (isPlaying) audio.play().catch(e => console.warn("Autoplay blocked", e));
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, [selectedFile]);

    useEffect(() => {
        // Watch playing state for the current audio
        if (audioRef.current) {
            if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
            else audioRef.current.pause();
        }
    }, [isPlaying]);

    const togglePlay = () => setIsPlaying(!isPlaying);

    // --- SPECTROGRAM RENDERING (CANVAS) ---
    useEffect(() => {
        if (!canvasRef.current || !selectedFile || !selectedFile.spectrogram) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const spec = selectedFile.spectrogram; // 2D array [freq_bins][time_steps]
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        ctx.clearRect(0, 0, width, height);

        const nFreqs = spec.length;
        const nTime = spec[0].length;

        const cellWidth = width / nTime;
        const cellHeight = height / nFreqs;

        // Render detailed heatmap
        for (let t = 0; t < nTime; t++) {
            for (let f = 0; f < nFreqs; f++) {
                const val = spec[f][t] || 0; // 0.0 to 1.0 (approximated)

                // Color Map: Magma-ish (Black -> Purple -> Orange -> Yellow)
                // Simple implementation:
                // Low (0.0): Black (0,0,0)
                // Mid (0.5): Purple (120, 20, 120)
                // High (1.0): Yellow (255, 255, 0)

                let r, g, b;
                if (val < 0.5) {
                    // Black to Purple
                    const p = val * 2;
                    r = p * 120; g = p * 20; b = p * 120;
                } else {
                    // Purple to Yellow
                    const p = (val - 0.5) * 2;
                    r = 120 + p * 135; // 120->255
                    g = 20 + p * 235;  // 20->255
                    b = 120 - p * 120; // 120->0
                }

                // Index f=0 is low freq (bottom), but canvas y=0 is top.
                // spec usually has low freq at index 0? Check librosa.
                // Librosa Mel: index 0 is low freq? 
                // Let's assume standard: we draw index 0 at BOTTOM (y = height - cellHeight)

                const y = height - (f + 1) * cellHeight;

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(t * cellWidth, y, cellWidth + 0.5, cellHeight + 0.5); // +0.5 to fix gaps
            }
        }
    }, [selectedFile]);

    // Waveform: Fallback mock if real not present (during loading)
    const waveformData = useMemo(() => {
        if (selectedFile?.waveform) return selectedFile.waveform;
        // Mock fallback
        return Array(60).fill(10);
    }, [selectedFile]);

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="p-6 md:p-8 flex flex-col gap-6">
            {/* ... Header ... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Exploratory Data Analysis</h1>
                    <p className="text-slate-500 dark:text-gray-400">Deep dive into signal characteristics and class balance.</p>
                </div>
                {/* Dataset Selector (Same as before) */}
                <div className="flex items-center gap-3 bg-white dark:bg-card-dark p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400 pl-2 uppercase tracking-wider hidden sm:block">Dataset:</span>
                    <select
                        value={activeDataset}
                        onChange={(e) => handleDatasetChange(e.target.value as DatasetKey)}
                        className="bg-gray-50 dark:bg-[#151b26] border-none text-sm font-bold text-slate-900 dark:text-white rounded focus:ring-2 focus:ring-primary cursor-pointer py-1.5 pl-3 pr-8"
                    >
                        <option value="torgo">TORGO_DB_v2</option>
                        <option value="uaspeech">UASpeech_Isolated</option>
                    </select>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - Stats & Distribution */}
                <div className="flex flex-col gap-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
                            <p className="text-primary text-2xl font-bold">{currentData.stats.samples}</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold mt-1">Samples</p>
                        </div>
                        <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
                            <p className="text-primary text-2xl font-bold">{currentData.stats.classes}</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold mt-1">Classes</p>
                        </div>
                        <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
                            <p className="text-primary text-2xl font-bold">{currentData.stats.avgLen}</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold mt-1">Avg Len</p>
                        </div>
                    </div>

                    {/* ... Summary Table ... (Keep existing layout) */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Dataset Summary</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{currentData.name}</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                {/* ... Table Header ... */}
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold">
                                        <th className="pb-3 pr-2">Class</th>
                                        <th className="pb-3 px-2 text-right">Speakers</th>
                                        <th className="pb-3 px-2 text-right">Total</th>
                                        <th className="pb-3 pl-2 text-right">Train/Test</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                    {currentData.summaryData.map((row, idx) => (
                                        <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-3 pr-2 font-semibold text-slate-700 dark:text-gray-300">{row.category}</td>
                                            <td className="py-3 px-2 text-right font-mono text-slate-500">{row.speakers}</td>
                                            <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">{row.totalRaw.toLocaleString()}</td>
                                            <td className="py-3 pl-2 text-right font-mono text-slate-500 text-xs">
                                                {row.trainRaw.toLocaleString()} / {row.testRaw.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Footer */}
                                    <tr className="bg-gray-50/50 dark:bg-white/5 font-bold text-slate-900 dark:text-white">
                                        <td className="py-3 pr-2">Total</td>
                                        <td className="py-3 px-2 text-right font-mono">{currentData.summaryData.reduce((a, b) => a + b.speakers, 0)}</td>
                                        <td className="py-3 px-2 text-right font-mono">{currentData.summaryData.reduce((a, b) => a + b.totalRaw, 0).toLocaleString()}</td>
                                        <td className="py-3 pl-2 text-right font-mono"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Technical Specifications */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex-1">
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

                {/* Right Col - Audio Visualization */}
                <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
                    {/* Header / Selector */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#151b26]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Signal Inspector
                                    <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 uppercase">
                                        {activeCategory === 'dysarthric' ? 'Impaired' : 'Control'}
                                    </span>
                                </h3>
                            </div>
                            <div className="flex items-center gap-4 bg-white dark:bg-card-dark p-1 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                                <button onClick={() => handleCategoryChange('dysarthric')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeCategory === 'dysarthric' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Dysarthric</button>
                                <button onClick={() => handleCategoryChange('control')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeCategory === 'control' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Non-Dysarthric</button>
                            </div>
                        </div>
                    </div>

                    {/* File List */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex gap-3 overflow-x-auto no-scrollbar bg-white dark:bg-card-dark min-h-[70px]">
                        {fileList.length === 0 && <div className="text-xs text-gray-500 p-2 italic">No samples available. Run training first.</div>}
                        {fileList.map((file) => (
                            <button
                                key={file.id}
                                onClick={() => handleFileSelect(file)}
                                className={`flex flex-col items-start min-w-[140px] p-2 rounded-lg border text-left transition-all ${selectedFile?.id === file.id
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <span className={`text-xs font-bold truncate w-full ${selectedFile?.id === file.id ? 'text-primary' : 'text-slate-700 dark:text-gray-300'}`}>{file.name}</span>
                                <div className="flex justify-between w-full mt-1">
                                    <span className="text-[10px] text-gray-400 font-mono">{file.duration}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="p-6 flex flex-col gap-8 flex-1 bg-white dark:bg-card-dark">
                        {/* Waveform */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <button onClick={togglePlay} className={`size-8 rounded-full ${isPlaying ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-white'} hover:scale-105 flex items-center justify-center transition-all`}>
                                        <span className="material-symbols-outlined text-lg">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                    </button>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amplitude / Time</span>
                                </div>
                                <span className="text-xs font-mono text-slate-400">
                                    {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                                </span>
                            </div>
                            <div className="h-32 w-full bg-slate-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-gray-800 relative flex items-center px-2 gap-[2px] sm:gap-1 overflow-hidden">
                                {waveformData.map((height, i) => (
                                    <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${selectedFile?.type === 'dysarthric' ? 'bg-red-400/80 dark:bg-red-500/60' : 'bg-primary/80 dark:bg-primary/60'}`} style={{ height: `${height}%` }}></div>
                                ))}
                                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10 transition-all duration-75 linear" style={{ left: `${progressPct}%` }}></div>
                            </div>
                        </div>

                        {/* Spectrogram Canvas */}
                        <div className="flex flex-col gap-2 flex-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mel-Spectrogram (Real Data)</span>
                            </div>
                            <div className="w-full h-48 rounded-lg overflow-hidden relative bg-black">
                                {selectedFile?.spectrogram ? (
                                    <canvas ref={canvasRef} width={300} height={80} className="w-full h-full object-cover opacity-90" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Select a file to view Spectrogram</div>
                                )}
                                <div className="absolute top-0 bottom-0 w-[1px] bg-white/50 z-10" style={{ left: `${progressPct}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EDADashboard;