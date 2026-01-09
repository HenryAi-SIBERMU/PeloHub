import React, { useState, useRef, useEffect } from 'react';
import { PredictionResult, LogEntry } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const AVAILABLE_MODELS = [
  { id: 'cnn', name: 'CNN-STFT v2', latency: 1200, desc: 'Best balance of speed & accuracy' },
  { id: 'mobilenet', name: 'MobileNetV3Small', latency: 800, desc: 'Ultra-low latency inference' },
  { id: 'resnet', name: 'ResNet-50', latency: 3000, desc: 'Deep residual network' },
  { id: 'vgg', name: 'VGG-16', latency: 4500, desc: 'Legacy architecture' }
];

interface LivePredictionProps {
  onAnalysisComplete: (log: LogEntry) => void;
}

const LivePrediction: React.FC<LivePredictionProps> = ({ onAnalysisComplete }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'upload' | 'record'>('upload');
  const [selectedModelId, setSelectedModelId] = useState<string>('cnn');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Audio State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [fileMetadata, setFileMetadata] = useState({ format: '--', bitDepth: '--' });

  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'done'>('idle');
  const [result, setResult] = useState<PredictionResult | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0); // Time where we paused

  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  const activeModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // --- AUDIO PROCESSING ---
  const processAudioFile = async (blob: Blob, fileName?: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // 1. Extract Metadata (Bit Depth & Format)
      const arrayBuffer = await blob.arrayBuffer();
      let detectedFormat = 'WAV'; // Default fallback
      let detectedBitDepth = '32-bit Float'; // Default for Web Audio decode

      // Try to determine from filename first
      if (fileName) {
        const ext = fileName.split('.').pop()?.toUpperCase();
        if (ext) detectedFormat = ext;
      } else if (blob.type) {
        if (blob.type.includes('wav')) detectedFormat = 'WAV';
        else if (blob.type.includes('mpeg') || blob.type.includes('mp3')) detectedFormat = 'MP3';
        else if (blob.type.includes('webm')) detectedFormat = 'WEBM';
        else if (blob.type.includes('ogg')) detectedFormat = 'OGG';
      }

      // Deep inspection for WAV Bit Depth
      if (detectedFormat === 'WAV') {
        try {
          const view = new DataView(arrayBuffer.slice(0, 44));
          // Check RIFF header
          const isRiff = view.getUint32(0, false) === 0x52494646; // "RIFF"
          if (isRiff) {
            // Offset 34 is usually BitsPerSample in standard PCM WAVE header
            const bits = view.getUint16(34, true);
            detectedBitDepth = `${bits}-bit`;
          }
        } catch (e) {
          console.warn("Could not parse WAV header", e);
        }
      } else if (detectedFormat === 'MP3' || detectedFormat === 'WEBM') {
        detectedBitDepth = 'Compressed';
      }

      setFileMetadata({ format: detectedFormat, bitDepth: detectedBitDepth });

      // 2. Decode Audio
      const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      setAudioBuffer(decodedBuffer);
      setDuration(decodedBuffer.duration);
      generateWaveform(decodedBuffer);

      // Reset player
      stopAudio();
      setCurrentTime(0);
      pausedTimeRef.current = 0;

      // Defer spectrogram generation to let UI render first
      setTimeout(() => generateSpectrogram(decodedBuffer), 100);

    } catch (error) {
      console.error("Error decoding audio data:", error);
      alert("Failed to decode audio file. Please use a supported format (WAV, MP3, FLAC).");
    }
  };

  const generateWaveform = (buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0);
    const samples = 100; // More detail
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];

    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum = sum + Math.abs(rawData[blockStart + j]);
      }
      filteredData.push((sum / blockSize) * 100 * 3);
    }
    setWaveformData(filteredData);
  };

  const generateSpectrogram = (buffer: AudioBuffer) => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
    const step = Math.floor(data.length / width);
    // Simple color map
    const getColor = (value: number) => {
      // Value 0-255
      const h = 280 - (value * 240 / 255); // Purple to Red mapping
      return `hsl(${h}, 100%, ${value / 2.5}%)`;
    };

    // Very simplified Spectrogram drawing (simulated FFT by bands for responsiveness)
    for (let x = 0; x < width; x++) {
      const start = x * step;
      const chunk = data.slice(start, start + Math.min(step, 512));

      for (let y = 0; y < height; y += 4) {
        let intensity = 0;
        for (let i = 0; i < chunk.length; i++) intensity += Math.abs(chunk[i]);
        intensity = (intensity / chunk.length) * 500;
        const noise = Math.random() * 20;
        const val = Math.min(255, Math.max(0, intensity * (255 - y * 2) / 100 + noise));

        ctx.fillStyle = getColor(val);
        ctx.fillRect(x, height - y, 1, 4);
      }
    }

    // Overlay grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  // --- PLAYER CONTROLS ---
  const playAudio = (startTimeOffset?: number) => {
    if (!audioContextRef.current || !audioBuffer) return;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Stop existing source if any
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) { }
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    // Calculate start time
    const startOffset = startTimeOffset !== undefined ? startTimeOffset : pausedTimeRef.current;
    const validOffset = Math.max(0, Math.min(startOffset, duration));

    startTimeRef.current = audioContextRef.current.currentTime - validOffset;

    source.start(0, validOffset);
    sourceNodeRef.current = source;

    source.onended = () => {
      const currentTime = audioContextRef.current?.currentTime || 0;
      const playedDuration = currentTime - startTimeRef.current;
      if (playedDuration >= duration - 0.1) {
        setIsPlaying(false);
        setCurrentTime(0);
        pausedTimeRef.current = 0;
      }
    };

    setIsPlaying(true);
    startAnimationLoop();
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.stop();
      pausedTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
      stopAnimationLoop();
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) { }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    stopAnimationLoop();
  };

  const togglePlayback = () => {
    if (isPlaying) pauseAudio();
    else playAudio();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioBuffer || !waveformContainerRef.current) return;

    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    setCurrentTime(newTime);
    pausedTimeRef.current = newTime;

    if (isPlaying) {
      playAudio(newTime);
    }
  };

  const startAnimationLoop = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const loop = () => {
      if (audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        if (startTimeRef.current > 0) {
          const current = now - startTimeRef.current;
          if (current <= duration) {
            setCurrentTime(current);
            animationFrameRef.current = requestAnimationFrame(loop);
          } else {
            setCurrentTime(duration);
          }
        } else {
          animationFrameRef.current = requestAnimationFrame(loop);
        }
      }
    };
    loop();
  };

  const stopAnimationLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // --- RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Typically browser records in webm/ogg
        const mimeType = mediaRecorder.mimeType;
        const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'wav';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        setAudioBlob(blob);
        processAudioFile(blob, `mic_recording.${ext}`);
        setSelectedFile(new File([blob], `mic_recording.${ext}`, { type: mimeType }));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioBuffer(null);
      setWaveformData([]);
      setFileMetadata({ format: '--', bitDepth: '--' });
      setAnalysisState('idle');
      setResult(null);

      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);

    } catch (error) {
      console.error("Microphone error:", error);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // --- ANALYSIS ---
  const runAnalysis = async () => {
    if (!audioBlob) return;
    setAnalysisState('analyzing');
    if (!isPlaying) playAudio();

    // 1. Map Frontend ID to Backend Model Parameter
    const modelMap: Record<string, string> = {
      'cnn': 'cnn_stft',
      'mobilenet': 'mobilenet',
      'resnet': 'resnet',
      'vgg': 'vgg'
    };
    const backendModelName = modelMap[selectedModelId] || selectedModelId;

    // 2. Prepare FormData
    const formData = new FormData();
    const fileName = selectedFile ? selectedFile.name : `recording_${Date.now()}.wav`;
    formData.append('file', audioBlob, fileName);

    try {
      // 3. Send Request to Real Backend
      const response = await fetch(`http://localhost:8000/predict/${backendModelName}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 4. Parse Backend Response
      // Backend: { "model": "...", "prediksi": "Dysarthric" | "Control", "confidence": "95.2%", "detail_probabilitas": {...} }

      const rawLabel = data.prediksi; // Expecting "Dysarthric" or "Control"
      const label = rawLabel === 'Control' ? 'Non-Dysarthric' : 'Dysarthric';

      // Confidence Logic: Prioritize detail_probabilitas (float), fallback to string parsing
      let confidenceVal = 0;
      if (data.detail_probabilitas) {
        // Get the probability of the PREDICTED class
        // If rawLabel is Control, get Control prob. If Dysarthric, get Dysarthric prob.
        // Or simpler: Just take the max value as that determines the prediction.
        const probs = Object.values(data.detail_probabilitas) as number[];
        confidenceVal = Math.max(...probs);
      } else {
        // Fallback: Parse string "95.2%" -> 0.952
        confidenceVal = parseFloat(data.confidence.replace('%', '')) / 100;
      }

      // Severity Logic (Frontend Calculation based on Dysarthric confidence)
      let severity: 'Low' | 'Mid' | 'High' | 'None' = 'None';
      if (label === 'Dysarthric') {
        // If predicted Dysarthric, gauge severity by confidence level
        if (confidenceVal > 0.90) severity = 'High';
        else if (confidenceVal > 0.70) severity = 'Mid';
        else severity = 'Low';
      }

      const newResult: PredictionResult = {
        label: label,
        confidence: confidenceVal,
        severity: severity,
        features: {
          jitter: '--', // Not provided by backend yet
          shimmer: '--',
          hnr: '--'
        }
      };

      setResult(newResult);

      // Send log to parent
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        source: mode,
        fileName: fileName,
        duration: formatTime(duration),
        signal: {
          format: fileMetadata.format,
          bitDepth: fileMetadata.bitDepth,
          sampleRate: audioBuffer ? audioBuffer.sampleRate : 0,
          channels: audioBuffer ? (audioBuffer.numberOfChannels === 1 ? 'Mono' : 'Stereo') : '--'
        },
        result: newResult,
        modelName: activeModel.name
      };

      onAnalysisComplete(newLog);
      setAnalysisState('done');

    } catch (error) {
      console.error("Prediction Error:", error);
      alert("Gagal terhubung ke Backend API.\nPastikan server berjalan di http://localhost:8000");
      setAnalysisState('idle');
    }
  };

  // --- HELPERS ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAudioBlob(file);
      processAudioFile(file, file.name);
      setAnalysisState('idle');
      setResult(null);
    }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('live.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('live.subtitle')}</p>
        </div>

        {/* MODEL SELECTOR */}
        <div className="flex items-center gap-3 bg-white dark:bg-card-dark p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full md:w-auto">
          <div className="pl-3 pr-2 hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('live.select_engine')}</span>
          </div>
          <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 hidden sm:block"></div>
          <div className="relative flex-1 md:flex-none">
            <select
              value={selectedModelId}
              onChange={(e) => {
                setSelectedModelId(e.target.value);
                setAnalysisState('idle');
                setResult(null);
              }}
              className="w-full md:w-64 bg-gray-50 dark:bg-[#151b26] border-none text-sm font-bold text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary cursor-pointer py-2 pl-3 pr-8"
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT COLUMN: INPUT & VISUALIZATION */}
        <div className="flex flex-col gap-6">

          {/* Toggle Switch */}
          <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex w-full max-w-md mx-auto lg:mx-0">
            <button
              onClick={() => { setMode('upload'); stopAudio(); }}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'upload' ? 'bg-white dark:bg-card-dark shadow text-primary' : 'text-slate-500 dark:text-gray-400'}`}
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              {t('live.upload')}
            </button>
            <button
              onClick={() => { setMode('record'); stopAudio(); }}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'record' ? 'bg-white dark:bg-card-dark shadow text-primary' : 'text-slate-500 dark:text-gray-400'}`}
            >
              <span className="material-symbols-outlined text-[18px]">mic</span>
              {t('live.mic')}
            </button>
          </div>

          <div className="bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm min-h-[320px] flex flex-col items-center justify-center text-center relative overflow-hidden transition-all">

            {/* UPLOAD MODE */}
            {mode === 'upload' && (
              <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 w-full h-full flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('live.drag_drop')}</h3>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 max-w-xs">{t('live.supported')}</p>
                </div>
              </div>
            )}

            {/* RECORD MODE */}
            {mode === 'record' && (
              <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300">
                {isRecording ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <div className="relative size-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                        <span className="material-symbols-outlined text-4xl">mic</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{formatTime(recordingTime)}</h3>
                      <p className="text-sm text-red-500 font-bold animate-pulse mt-1">{t('live.recording')}</p>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:opacity-90 transition-opacity"
                    >
                      {t('live.stop_rec')}
                    </button>
                    {/* Visualizer bars simulation */}
                    <div className="flex gap-1 h-8 items-end mt-4">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-1.5 bg-red-400 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.2 + Math.random() * 0.5}s` }}></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <button
                      onClick={startRecording}
                      className="size-24 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-500/20 transition-all hover:scale-105"
                    >
                      <span className="material-symbols-outlined text-4xl">mic</span>
                    </button>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('live.start_rec')}</h3>
                      <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{t('live.rec_hint')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VISUALIZATION CARD */}
          {audioBuffer && (
            <div className="bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">

              {/* Header & Controls */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">equalizer</span>
                  {t('live.signal_analysis')}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-slate-500 font-mono px-2 py-1 rounded">{fileMetadata.format}</span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-slate-500 font-mono px-2 py-1 rounded">{fileMetadata.bitDepth}</span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-slate-500 font-mono px-2 py-1 rounded">{audioBuffer.sampleRate}Hz</span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-slate-500 font-mono px-2 py-1 rounded">{audioBuffer.numberOfChannels === 1 ? 'Mono' : 'Stereo'}</span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-slate-500 font-mono px-2 py-1 rounded">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Visualizer Container */}
              <div className="flex flex-col gap-4">

                {/* Amplitude Waveform (Clickable Slider) */}
                <div className="relative group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amplitude (Seekable)</span>
                    <button
                      onClick={togglePlayback}
                      className="size-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-2xl fill-current">{isPlaying ? 'pause' : 'play_arrow'}</span>
                    </button>
                  </div>

                  {/* Interactive Container */}
                  <div
                    ref={waveformContainerRef}
                    onClick={handleSeek}
                    className="h-20 w-full bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center px-2 gap-1 overflow-hidden relative cursor-pointer"
                  >
                    {/* Bars */}
                    {waveformData.map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full bg-slate-400/50 dark:bg-slate-600/50 pointer-events-none"
                        style={{ height: `${Math.min(100, height)}%` }}
                      ></div>
                    ))}

                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 transition-none pointer-events-none shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                  </div>
                </div>

                {/* Spectrogram (Static Heatmap) */}
                <div className="relative">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Spectrogram</span>
                  <div
                    className="w-full h-32 rounded-lg overflow-hidden relative bg-black border border-gray-800"
                  >
                    <canvas
                      ref={spectrogramCanvasRef}
                      width={600}
                      height={128}
                      className="w-full h-full"
                    />

                    {/* Synchronized Playhead Overlay for Spectrogram */}
                    <div
                      className="absolute top-0 bottom-0 w-[1px] bg-white/50 z-10 pointer-events-none"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    ></div>

                    {/* Loading State */}
                    {!audioBuffer && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-xs text-white/50">{t('live.processing')}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-medium text-slate-600 dark:text-gray-300">{t('live.ready')}</span>
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={analysisState === 'analyzing'}
                  className={`px-6 py-2 rounded-lg font-bold text-white text-sm transition-all shadow-lg ${analysisState === 'analyzing' ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-600 shadow-primary/20'}`}
                >
                  {analysisState === 'analyzing' ? t('live.processing') : t('live.run')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RESULTS SECTION */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {t('live.results')}
              {analysisState === 'done' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">{t('live.completed')}</span>}
            </h2>
            {analysisState === 'done' && (
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{t('live.via')} {activeModel.name}</span>
            )}
          </div>

          <div className={`bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-2xl p-1 flex-1 flex flex-col transition-all duration-500 relative overflow-hidden ${analysisState === 'idle' ? 'opacity-50 grayscale' : ''}`}>

            {analysisState === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-black/50 backdrop-blur-[1px]">
                <div className="text-center p-6">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-gray-600 mb-2">analytics</span>
                  <p className="text-slate-400 dark:text-gray-500 font-medium">{t('live.select_file')}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-600 mt-2 bg-gray-100 dark:bg-gray-800 py-1 px-3 rounded-full inline-block">Current Engine: {activeModel.name}</p>
                </div>
              </div>
            )}

            {/* Analysis Content */}
            <div className="p-8 flex flex-col h-full">

              {/* Centered Top Section: Verdict & Progress */}
              <div className="flex-1 flex flex-col justify-center gap-10">

                {/* Main Verdict */}
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('live.model_class')}</p>
                  {analysisState === 'analyzing' ? (
                    <div className="h-16 flex items-center justify-center gap-1">
                      <span className="size-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="size-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="size-3 bg-primary rounded-full animate-bounce"></span>
                    </div>
                  ) : result ? (
                    <div className="animate-in zoom-in-95 duration-500">
                      <h3 className={`text-4xl md:text-5xl font-black mb-2 ${result.label === 'Dysarthric' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {result.label === 'Dysarthric' ? t('gen.dysarthric') : t('gen.non_dysarthric')}
                      </h3>
                      <p className="text-slate-500 dark:text-gray-400 font-medium">
                        {t('live.conf')}: <span className="text-slate-900 dark:text-white font-bold">{(result.confidence * 100).toFixed(1)}%</span>
                      </p>
                    </div>
                  ) : (
                    <div className="h-16 bg-slate-100 dark:bg-white/5 rounded-lg w-3/4 mx-auto mt-2"></div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-emerald-500">{t('gen.non_dysarthric')}</span>
                    <span className="text-red-500">{t('gen.dysarthric')}</span>
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
                    {result && (
                      <div
                        className="absolute top-0 bottom-0 w-2 h-full bg-slate-900 dark:bg-white z-10 border-2 border-white dark:border-gray-900 rounded-full shadow transition-all duration-1000 ease-out"
                        style={{
                          left: result.label === 'Dysarthric'
                            ? `${(0.5 + (result.confidence / 2)) * 100}%`
                            : `${(0.5 - (result.confidence / 2)) * 100}%`
                        }}
                      ></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-gray-200 dark:via-gray-700 to-red-500 opacity-20"></div>
                  </div>
                  <div className="flex justify-center mt-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Threshold (0.5)</span>
                  </div>
                </div>

              </div>

              {/* Features Grid (Pinned Bottom) */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Jitter (Stability)</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                    {result ? result.features.jitter : '--'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Shimmer (Amplitude)</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                    {result ? result.features.shimmer : '--'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-800 col-span-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{t('live.severity')}</p>
                      <p className={`text-xl font-bold ${result?.severity === 'High' ? 'text-red-600' :
                          result?.severity === 'Mid' ? 'text-orange-500' :
                            result?.severity === 'Low' ? 'text-yellow-500' : 'text-slate-400'
                        }`}>
                        {result ? (
                          result.severity === 'High' ? t('gen.high') :
                            result.severity === 'Mid' ? t('gen.mid') :
                              result.severity === 'Low' ? t('gen.low') : t('gen.none')
                        ) : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 text-right">Harmonics-to-Noise</p>
                      <p className="text-xl font-mono font-bold text-slate-900 dark:text-white text-right">
                        {result ? result.features.hnr : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LivePrediction;