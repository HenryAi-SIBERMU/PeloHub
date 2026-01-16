import React, { useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import PageTransition from './components/PageTransition';
import Dashboard from './pages/Dashboard';
import EDADashboard from './pages/EDADashboard';
import ModelEvaluation from './pages/ModelEvaluation';
import TrainingEfficiency from './pages/TrainingEfficiency';
import Documentation from './pages/Documentation';
import LivePrediction from './pages/LivePrediction';
import AnalysisLogs from './pages/AnalysisLogs';
import BuildEngine from './pages/BuildEngine';
import { LogEntry } from './types';
import { LanguageProvider } from './contexts/LanguageContext';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#f6f6f8] dark:bg-[#101622] overflow-hidden font-display">
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-800 z-50">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm">graphic_eq</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">PeloHub</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-[#101622] scroll-smooth">
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const location = useLocation();

  const addLogEntry = (log: LogEntry) => {
    setLogs(prev => [log, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        {/* @ts-ignore */}
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          } />
          <Route path="/eda" element={
            <PageTransition>
              <EDADashboard />
            </PageTransition>
          } />
          <Route path="/evaluation" element={
            <PageTransition>
              <ModelEvaluation />
            </PageTransition>
          } />
          <Route path="/training" element={
            <PageTransition>
              <TrainingEfficiency />
            </PageTransition>
          } />
          <Route path="/prediction" element={
            <PageTransition>
              <LivePrediction onAnalysisComplete={addLogEntry} />
            </PageTransition>
          } />
          <Route path="/logs" element={
            <PageTransition>
              <AnalysisLogs logs={logs} onClear={clearLogs} />
            </PageTransition>
          } />
          <Route path="/build-engine" element={
            <PageTransition>
              <BuildEngine />
            </PageTransition>
          } />
          <Route path="/documentation" element={
            <PageTransition>
              <Documentation />
            </PageTransition>
          } />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </LanguageProvider>
  );
};

export default App;