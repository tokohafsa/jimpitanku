import { GoogleGenAI } from "@google/genai";
import { Member, Arrear } from "../types";

// Polyfill type for process to avoid TS errors
declare var process: any;

export const generateFinancialInsight = async (members: Member[], arrears: Arrear[]) => {
  // Cek ketersediaan API KEY
  // Guideline: The API key must be obtained exclusively from the environment variable process.env.GEMINI_API_KEY.
  if (!process.env.GEMINI_API_KEY) {
    console.warn("API Key not found");
    return "Mode Offline: Analisis AI memerlukan koneksi internet dan API Key yang valid. Silakan cek data secara manual.";
  }

  try {
    // Inisialisasi di dalam fungsi agar tidak crash saat app load jika key kosong
    // Guideline: Always use const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Calculate generic stats for context
    const totalDebt = arrears.filter(a => a.status === 'BELUM_LUNAS').reduce((acc, c) => acc + c.amount, 0);
    const totalCollected = arrears.filter(a => a.status === 'LUNAS').reduce((acc, c) => acc + c.amount, 0);
    
    // Find top debtors
    const debtors: Record<string, number> = {};
    arrears.filter(a => a.status === 'BELUM_LUNAS').forEach(a => {
      debtors[a.memberName] = (debtors[a.memberName] || 0) + a.amount;
    });

    const dataContext = JSON.stringify({
      summary: {
        totalMembers: members.length,
        totalDebtPending: totalDebt,
        totalMoneyCollected: totalCollected
      },
      topDebtors: debtors,
      recentHistory: arrears.slice(0, 30),
      appDescription: "Aplikasi pencatatan tunggakan dan iuran warga."
    });

    const prompt = `
      Bertindaklah sebagai akuntan komunitas yang cerdas.
      Analisis data keuangan berikut (JSON):
      ${dataContext}

      Berikan laporan ringkas (Markdown) yang mencakup:
      1. **Kesehatan Keuangan**: Bandingkan uang masuk vs tunggakan.
      2. **Pola Kepatuhan**: Analisis siapa yang sering menunggak (jika ada data nama).
      3. **Rekomendasi Penagihan**: Saran sopan cara menagih anggota yang memiliki tunggakan besar.
      4. **Prediksi**: Risiko cashflow bulan depan.
      
      Gunakan bahasa Indonesia yang profesional namun santai.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text ?? "Maaf, tidak dapat menghasilkan analisis saat ini.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Gagal menghubungi AI. Pastikan Anda online dan API Key valid.";
  }
};