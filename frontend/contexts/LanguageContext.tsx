import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'id' | 'en';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const translations = {
  id: {
    // Sidebar
    'sidebar.overview': 'Ringkasan',
    'sidebar.live': 'Prediksi Langsung',
    'sidebar.logs': 'Log Analisis',
    'sidebar.system': 'Sistem',
    'sidebar.report': 'Laporan Mesin',
    'sidebar.eda': 'Dataset & EDA',
    'sidebar.eval': 'Evaluasi Model',
    'sidebar.train': 'Efisiensi Training',
    'sidebar.build_engine': 'Buat Mesin Anda', // New
    'sidebar.settings': 'Pengaturan',
    'sidebar.docs': 'Dokumentasi',
    'sidebar.role': 'Peneliti Utama',
    
    // Build Engine (New)
    'build.title': 'Buat Mesin Kustom',
    'build.subtitle': 'Fitur ini sedang dalam pengembangan.',
    'build.desc': 'Segera hadir: Antarmuka tanpa kode untuk melatih, menyempurnakan, dan menggunakan model pengenalan ucapan disartria kustom Anda sendiri langsung di browser.',
    'build.notify': 'Beri tahu saya saat siap',

    // Dashboard
    'dash.title': 'Ringkasan Penelitian',
    'dash.status': 'Status Proyek:',
    'dash.phase': 'Fase Evaluasi Aktif',
    'dash.gen_report': 'Buat Laporan',
    'dash.latest_exp': 'Eksperimen Terakhir',
    'dash.exp_desc': 'Hasil analisis komparatif telah keluar: Model CNN-STFT yang ringan menunjukkan kecepatan inferensi superior dengan akurasi kompetitif dibandingkan baseline ResNet50.',
    'dash.view_analysis': 'Lihat Analisis',
    'dash.check_logs': 'Cek Log',
    'dash.stat.samples': 'Total Sampel',
    'dash.stat.accuracy': 'Akurasi Tertinggi',
    'dash.stat.inference': 'Waktu Inferensi',
    'dash.stat.error': 'Tingkat Eror',
    'dash.deep_dive': 'Analisis Mendalam',
    'dash.activity': 'Aktivitas Terbaru',

    // Live Prediction
    'live.title': 'Prediksi Langsung',
    'live.subtitle': 'Uji inferensi dengan sampel audio dunia nyata',
    'live.select_engine': 'Pilih Mesin',
    'live.upload': 'Unggah Berkas',
    'live.mic': 'Mikrofon',
    'live.drag_drop': 'Seret & Lepas atau Klik',
    'live.supported': 'Format: WAV, MP3, FLAC (Maks 10MB)',
    'live.recording': 'Merekam...',
    'live.start_rec': 'Mulai Merekam',
    'live.stop_rec': 'Berhenti Merekam',
    'live.rec_hint': 'Silakan bicara dengan jelas selama minimal 3 detik',
    'live.signal_analysis': 'Analisis Sinyal',
    'live.ready': 'Siap untuk Inferensi',
    'live.processing': 'Memproses...',
    'live.run': 'Jalankan Analisis',
    'live.results': 'Hasil Prediksi',
    'live.completed': 'Selesai',
    'live.via': 'via',
    'live.select_file': 'Pilih berkas dan jalankan analisis',
    'live.model_class': 'Klasifikasi Model',
    'live.conf': 'Keyakinan',
    'live.severity': 'Tingkat Keparahan',
    'live.logs_title': 'Log Analisis',
    'live.clear': 'Hapus Riwayat',
    
    // Logs
    'logs.title': 'Log Analisis',
    'logs.subtitle': 'Riwayat sesi prediksi dan metrik sinyal',
    'logs.empty': 'Belum ada riwayat analisis',
    'logs.empty_sub': 'Jalankan prediksi di menu Prediksi Langsung untuk melihat laporan detail di sini.',
    'logs.col.time': 'Waktu',
    'logs.col.engine': 'Mesin Digunakan',
    'logs.col.source': 'Sumber / Berkas',
    'logs.col.signal': 'Info Sinyal',
    'logs.col.metrics': 'Metrik Akustik',
    'logs.col.pred': 'Prediksi',
    
    // General
    'gen.dysarthric': 'Disartria',
    'gen.non_dysarthric': 'Non-Disartria',
    'gen.low': 'Rendah',
    'gen.mid': 'Sedang',
    'gen.high': 'Tinggi',
    'gen.none': 'Tidak Ada',
  },
  en: {
    // Sidebar
    'sidebar.overview': 'Overview',
    'sidebar.live': 'Live Prediction',
    'sidebar.logs': 'Analysis Logs',
    'sidebar.system': 'System',
    'sidebar.report': 'Engine Report',
    'sidebar.eda': 'Datasets & EDA',
    'sidebar.eval': 'Model Evaluation',
    'sidebar.train': 'Training Efficiency',
    'sidebar.build_engine': 'Build Your Engine', // New
    'sidebar.settings': 'Settings',
    'sidebar.docs': 'Documentation',
    'sidebar.role': 'Lead Researcher',

    // Build Engine (New)
    'build.title': 'Build Custom Engine',
    'build.subtitle': 'This feature is currently under development.',
    'build.desc': 'Coming Soon: A no-code interface to train, fine-tune, and deploy your own custom dysarthric speech recognition models directly in the browser.',
    'build.notify': 'Notify me when ready',

    // Dashboard
    'dash.title': 'Research Overview',
    'dash.status': 'Project Status:',
    'dash.phase': 'Active Evaluation Phase',
    'dash.gen_report': 'Generate Report',
    'dash.latest_exp': 'Latest Experiment',
    'dash.exp_desc': 'Comparative analysis results are in: Lightweight CNN-STFT models demonstrate superior inference speed with competitive accuracy against ResNet50 baselines.',
    'dash.view_analysis': 'View Analysis',
    'dash.check_logs': 'Check Logs',
    'dash.stat.samples': 'Total Samples',
    'dash.stat.accuracy': 'Top Accuracy',
    'dash.stat.inference': 'Inference Time',
    'dash.stat.error': 'Error Rate',
    'dash.deep_dive': 'Deep Dive Analysis',
    'dash.activity': 'Recent Activity',

    // Live Prediction
    'live.title': 'Live Prediction',
    'live.subtitle': 'Test inference with real-world audio samples',
    'live.select_engine': 'Select Engine',
    'live.upload': 'Upload File',
    'live.mic': 'Microphone',
    'live.drag_drop': 'Drag & Drop or Click',
    'live.supported': 'Supported: WAV, MP3, FLAC (Max 10MB)',
    'live.recording': 'Recording...',
    'live.start_rec': 'Start Recording',
    'live.stop_rec': 'Stop Recording',
    'live.rec_hint': 'Please speak clearly for at least 3 seconds',
    'live.signal_analysis': 'Signal Analysis',
    'live.ready': 'Ready for Inference',
    'live.processing': 'Processing...',
    'live.run': 'Run Analysis',
    'live.results': 'Prediction Results',
    'live.completed': 'Completed',
    'live.via': 'via',
    'live.select_file': 'Select a file and run analysis',
    'live.model_class': 'Model Classification',
    'live.conf': 'Confidence',
    'live.severity': 'Predicted Severity',
    'live.logs_title': 'Analysis Logs',
    'live.clear': 'Clear History',

    // Logs
    'logs.title': 'Analysis Logs',
    'logs.subtitle': 'History of prediction sessions and signal metrics',
    'logs.empty': 'No analysis history yet',
    'logs.empty_sub': 'Run a prediction in the Live Prediction menu to see detailed analysis reports here.',
    'logs.col.time': 'Timestamp',
    'logs.col.engine': 'Engine Used',
    'logs.col.source': 'Source / File',
    'logs.col.signal': 'Signal Info',
    'logs.col.metrics': 'Acoustic Metrics',
    'logs.col.pred': 'Prediction',

    // General
    'gen.dysarthric': 'Dysarthric',
    'gen.non_dysarthric': 'Non-Dysarthric',
    'gen.low': 'Low',
    'gen.mid': 'Mid',
    'gen.high': 'High',
    'gen.none': 'None',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // DEFAULT LANGUAGE SET TO INDONESIAN ('id')
  const [language, setLanguage] = useState<Language>('id');

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};