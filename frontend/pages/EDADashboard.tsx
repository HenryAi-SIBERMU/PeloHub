import React, { useState, useMemo, useEffect } from 'react';
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

// --- MOCK DATA CONFIGURATION ---
const DATASETS: Record<DatasetKey, DatasetConfig> = {
  torgo: {
    name: 'TORGO_DB_v2',
    description: 'Dysarthric articulation of head-and-neck cancer patients.',
    stats: { samples: '2,000', classes: '2', avgLen: '4.2s' },
    specs: {
      format: '.wav',
      sampleRate: '16000 Hz',
      bitDepth: '16-bit',
      channels: '1 (Mono)',
      byteRate: '31 KB/s'
    },
    summaryData: [
      { category: 'Dysarthric', speakers: 8, totalRaw: 1000, trainRaw: 800, testRaw: 200 },
      { category: 'Non-Dysarthric', speakers: 7, totalRaw: 1000, trainRaw: 800, testRaw: 200 }
    ],
    files: {
      dysarthric: [
        { id: 't_d1', name: 'DYS_001_Severe_Phrase.wav', duration: '4.8s', durationSec: 4.8, type: 'dysarthric', severity: 'Severe' },
        { id: 't_d2', name: 'DYS_004_Mid_Vowel_A.wav', duration: '3.2s', durationSec: 3.2, type: 'dysarthric', severity: 'Mid' },
        { id: 't_d3', name: 'DYS_012_Low_Command.wav', duration: '5.1s', durationSec: 5.1, type: 'dysarthric', severity: 'Low' },
      ],
      control: [
        { id: 't_c1', name: 'CTRL_001_Normal_Phrase.wav', duration: '2.1s', durationSec: 2.1, type: 'control', severity: 'None' },
        { id: 't_c2', name: 'CTRL_005_Normal_Vowel.wav', duration: '1.8s', durationSec: 1.8, type: 'control', severity: 'None' },
      ]
    }
  },
  uaspeech: {
    name: 'UASpeech_Isolated',
    description: 'Isolated word recognition for cerebral palsy speakers.',
    stats: { samples: '15,200', classes: '4', avgLen: '1.8s' },
    specs: {
      format: '.wav',
      sampleRate: '16000 Hz',
      bitDepth: '16-bit',
      channels: '1 (Mono)',
      byteRate: '31 KB/s'
    },
    summaryData: [
      { category: 'Dysarthric', speakers: 15, totalRaw: 10500, trainRaw: 8400, testRaw: 2100 },
      { category: 'Non-Dysarthric', speakers: 10, totalRaw: 4700, trainRaw: 3760, testRaw: 940 }
    ],
    files: {
      dysarthric: [
        { id: 'u_d1', name: 'UAS_M04_Digit_One.wav', duration: '1.2s', durationSec: 1.2, type: 'dysarthric', severity: 'Very Low' },
        { id: 'u_d2', name: 'UAS_M04_Word_Apple.wav', duration: '1.9s', durationSec: 1.9, type: 'dysarthric', severity: 'Low' },
        { id: 'u_d3', name: 'UAS_F02_Command_Stop.wav', duration: '1.5s', durationSec: 1.5, type: 'dysarthric', severity: 'Mid' },
      ],
      control: [
        { id: 'u_c1', name: 'UAS_C01_Digit_One.wav', duration: '0.8s', durationSec: 0.8, type: 'control', severity: 'None' },
        { id: 'u_c2', name: 'UAS_C01_Word_Apple.wav', duration: '1.1s', durationSec: 1.1, type: 'control', severity: 'None' },
      ]
    }
  }
};

const EDADashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeDataset, setActiveDataset] = useState<DatasetKey>('torgo');
  const [activeCategory, setActiveCategory] = useState<'dysarthric' | 'control'>('dysarthric');
  
  // Initialize with first file of default dataset
  const [selectedFile, setSelectedFile] = useState<AudioFile>(DATASETS['torgo'].files['dysarthric'][0]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const currentData = DATASETS[activeDataset];

  // Reset when dataset changes
  const handleDatasetChange = (ds: DatasetKey) => {
    setActiveDataset(ds);
    setActiveCategory('dysarthric');
    setSelectedFile(DATASETS[ds].files['dysarthric'][0]);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  // Reset file selection when category changes
  const handleCategoryChange = (cat: 'dysarthric' | 'control') => {
    setActiveCategory(cat);
    setSelectedFile(currentData.files[cat][0]);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  // --- WAVEFORM SIMULATION LOGIC ---
  const waveformData = useMemo(() => {
    const bars = 120;
    const data = [];
    const seed = selectedFile.id.split('').reduce((a,b) => a + b.charCodeAt(0), 0); 
    const pseudoRandom = (i: number) => Math.abs(Math.sin(i + seed));

    for (let i = 0; i < bars; i++) {
        let val = 0;
        if (selectedFile.type === 'control') {
            const envelope = Math.sin(i * 0.15) * Math.sin(i * 0.05) + 0.5;
            val = envelope * (pseudoRandom(i) * 60 + 20);
        } else {
            const envelope = Math.sin(i * 0.05) + 0.2; 
            const gap = pseudoRandom(i) > 0.8 ? 0.1 : 1; 
            val = envelope * (pseudoRandom(i) * 80 + 10) * gap;
        }
        val = Math.max(5, Math.min(100, val));
        data.push(val);
    }
    return data;
  }, [selectedFile]);

  // --- PLAYBACK ANIMATION ---
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          const step = 100 / (selectedFile.durationSec * 10); 
          return prev + step;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedFile]);


  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Exploratory Data Analysis</h1>
          <p className="text-slate-500 dark:text-gray-400">Deep dive into signal characteristics and class balance.</p>
        </div>
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
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-blue-600 transition-colors">
                <span className="material-symbols-outlined text-[18px]">upload</span>
                <span className="hidden sm:inline">Add New</span>
            </button>
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

            {/* Distribution Table */}
            <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Dataset Summary</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{currentData.name}</p>
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold">
                                <th className="pb-3 pr-2">Class</th>
                                <th className="pb-3 px-2 text-right">Speakers</th>
                                <th className="pb-3 px-2 text-right">Total</th>
                                <th className="pb-3 pl-2 text-right">Split (80/20)</th>
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
                            {/* Footer Row for Total */}
                             <tr className="bg-gray-50/50 dark:bg-white/5 font-bold text-slate-900 dark:text-white">
                                <td className="py-3 pr-2">Total</td>
                                <td className="py-3 px-2 text-right font-mono">
                                    {currentData.summaryData.reduce((acc, r) => acc + r.speakers, 0)}
                                </td>
                                <td className="py-3 px-2 text-right font-mono">
                                   {currentData.summaryData.reduce((acc, r) => acc + r.totalRaw, 0).toLocaleString()}
                                </td>
                                <td className="py-3 pl-2 text-right font-mono">
                                   {currentData.summaryData.reduce((acc, r) => acc + r.trainRaw + r.testRaw, 0).toLocaleString()}
                                </td>
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
                        <button 
                            onClick={() => handleCategoryChange('dysarthric')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeCategory === 'dysarthric' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Dysarthric
                        </button>
                        <button 
                            onClick={() => handleCategoryChange('control')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeCategory === 'control' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Non-Dysarthric
                        </button>
                     </div>
                 </div>
            </div>
            
            {/* File List Horizontal Scroller */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex gap-3 overflow-x-auto no-scrollbar bg-white dark:bg-card-dark min-h-[70px]">
                {currentData.files[activeCategory].map((file) => (
                    <button
                        key={file.id}
                        onClick={() => { setSelectedFile(file); setIsPlaying(false); setPlaybackProgress(0); }}
                        className={`flex flex-col items-start min-w-[140px] p-2 rounded-lg border text-left transition-all ${
                            selectedFile.id === file.id 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <span className={`text-xs font-bold truncate w-full ${selectedFile.id === file.id ? 'text-primary' : 'text-slate-700 dark:text-gray-300'}`}>{file.name}</span>
                        <div className="flex justify-between w-full mt-1">
                            <span className="text-[10px] text-gray-400 font-mono">{file.duration}</span>
                            {file.severity !== 'None' && <span className={`text-[10px] font-bold ${activeDataset === 'torgo' ? 'text-orange-500' : 'text-indigo-400'}`}>{file.severity}</span>}
                        </div>
                    </button>
                ))}
            </div>

            <div className="p-6 flex flex-col gap-8 flex-1 bg-white dark:bg-card-dark">
                {/* Waveform */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                className={`size-8 rounded-full ${isPlaying ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-white'} hover:scale-105 flex items-center justify-center transition-all`}
                            >
                                <span className="material-symbols-outlined text-lg">{isPlaying ? 'pause' : 'play_arrow'}</span>
                            </button>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amplitude / Time</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                             {isPlaying ? ((playbackProgress/100) * selectedFile.durationSec).toFixed(1) : '0.0'}s / {selectedFile.duration}
                        </span>
                    </div>
                    
                    <div className="h-32 w-full bg-slate-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-gray-800 relative flex items-center px-2 gap-[2px] sm:gap-1 overflow-hidden">
                        {/* Dynamic Waveform Bars */}
                        {waveformData.map((height, i) => (
                            <div 
                                key={i} 
                                className={`flex-1 rounded-full transition-all duration-300 ${
                                    selectedFile.type === 'dysarthric' 
                                        ? 'bg-red-400/80 dark:bg-red-500/60 hover:bg-red-500' 
                                        : 'bg-primary/80 dark:bg-primary/60 hover:bg-primary'
                                }`}
                                style={{ height: `${height}%` }}
                            ></div>
                        ))}
                        
                        {/* Playhead Cursor */}
                        <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10 transition-all duration-100 linear"
                            style={{ left: `${playbackProgress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Spectrogram */}
                <div className="flex flex-col gap-2 flex-1">
                    <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mel-Spectrogram (80 bands)</span>
                         <div className="flex gap-2 text-[10px] text-gray-400 font-mono">
                            <span>0Hz</span>
                            <span className="w-16 h-2 rounded bg-gradient-to-r from-[#000004] via-[#721f81] to-[#fcfdbf]"></span>
                            <span>8kHz</span>
                         </div>
                    </div>
                    
                    <div 
                        className="w-full h-48 rounded-lg overflow-hidden relative transition-all duration-700" 
                        style={{ 
                            background: selectedFile.type === 'control'
                                ? 'linear-gradient(180deg, #000004 0%, #2a1b3d 30%, #8c2981 60%, #fd9a6a 100%)'
                                : 'linear-gradient(180deg, #1a0b00 0%, #4a1b00 40%, #8c2981 70%, #d95e40 100%)'
                        }}
                    >
                        <div 
                            className="absolute inset-0 opacity-40 mix-blend-overlay transition-opacity duration-500" 
                            style={{ 
                                backgroundImage: selectedFile.type === 'control'
                                    ? 'repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(255,255,255,0.2) 15px, rgba(255,255,255,0.2) 18px)' 
                                    : 'repeating-linear-gradient(90deg, transparent, transparent 25px, rgba(255,255,255,0.15) 25px, rgba(255,255,255,0.15) 40px)' 
                            }}
                        ></div>
                        
                         <div 
                            className="absolute inset-0 opacity-20 mix-blend-overlay" 
                            style={{ 
                                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.1) 12px)' 
                            }}
                        ></div>

                        <div 
                            className="absolute top-0 bottom-0 w-[1px] bg-white/50 z-10"
                            style={{ left: `${playbackProgress}%` }}
                        ></div>

                        <div className="absolute bottom-2 right-4 text-xs text-white/80 font-mono">Time (s) →</div>
                        <div className="absolute top-2 left-2 text-xs text-white/80 font-mono">Hz ↑</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EDADashboard;