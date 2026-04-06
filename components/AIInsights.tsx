import React, { useState } from 'react';
import { Member, Arrear } from '../types';
import { generateFinancialInsight } from '../services/geminiService';
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIInsightsProps {
  members: Member[];
  payments: Arrear[]; // Reusing component but passing Arrears
}

export const AIInsights: React.FC<AIInsightsProps> = ({ members, payments }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateFinancialInsight(members, payments);
      setAnalysis(result);
    } catch (err) {
      setError("Gagal menghubungi asisten AI. Pastikan koneksi internet lancar atau coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="text-indigo-600 w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">Asisten Keuangan Cerdas</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Gunakan kecerdasan buatan Gemini untuk menganalisis arus kas, tunggakan anggota, dan mendapatkan saran penagihan yang efektif.
        </p>
        
        {!analysis && !loading && (
          <button 
            onClick={handleAnalyze}
            className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 mx-auto"
          >
            <Sparkles size={18} />
            Mulai Analisis
          </button>
        )}
      </div>

      {loading && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800">Sedang Menganalisis Data...</h3>
          <p className="text-slate-500">Mohon tunggu sebentar, AI sedang membaca laporan tunggakan Anda.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-start gap-3">
          <AlertTriangle className="text-red-500 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-indigo-500" size={20} />
              Hasil Analisis
            </h3>
            <button 
              onClick={handleAnalyze} 
              className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="prose prose-indigo max-w-none text-slate-700">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
