export type PredictionResult = {
  label: 'Dysarthric' | 'Non-Dysarthric';
  confidence: number;
  severity?: 'Low' | 'Mid' | 'High' | 'None';
  features: {
    jitter: string;
    shimmer: string;
    hnr: string; // Harmonics-to-Noise Ratio
  };
};

export type LogEntry = {
  id: string;
  timestamp: Date;
  source: 'upload' | 'record';
  fileName: string;
  duration: string;
  signal: {
    format: string;
    bitDepth: string;
    sampleRate: number;
    channels: string;
  };
  result: PredictionResult;
  modelName: string;
};