import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, Sparkles, Check, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Tesseract from 'tesseract.js';
import { Item } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onScan: (itemId: string) => void;
  allowNewCode?: boolean;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  items,
  onScan,
  allowNewCode = false,
}: BarcodeScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start / Stop Camera Scanning
  useEffect(() => {
    if (!isOpen) return;

    setCameraError(null);
    setScanResult(null);
    setIsScanning(true);
    setOcrError(null);
    setIsOcrProcessing(false);

    const initScanner = async () => {
      // Small timeout to ensure the DOM element "reader" is rendered
      await new Promise((resolve) => setTimeout(resolve, 200));

      const element = document.getElementById('reader');
      if (!element) {
        console.error('Reader element not found in DOM');
        return;
      }

      try {
        const html5QrCode = new Html5Qrcode('reader');
        qrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.8;
              return { width: size, height: size * 0.65 };
            },
          },
          (decodedText) => {
            // Success call back
            const rawValue = decodedText.trim();
            // Look for matching item id (exact or partial)
            const matchedItem = items.find(
              (item) => item.id.toUpperCase() === rawValue.toUpperCase()
            );

            if (matchedItem) {
              handleSuccess(matchedItem.id);
            } else if (allowNewCode && rawValue) {
              handleSuccess(rawValue);
            }
          },
          (errorMessage) => {
            // verbose errors, safe to ignore during scan
          }
        );
      } catch (err: any) {
        console.error('Error starting camera with html5-qrcode:', err);
        setCameraError(
          'لم نتمكن من تشغيل الكاميرا. يرجى التحقق من إعطاء الصلاحية للكاميرا، أو استخدم ميزة محاكاة القراءة السريعة بالأسفل.'
        );
      }
    };

    initScanner();

    return () => {
      if (qrCodeRef.current) {
        const scanner = qrCodeRef.current;
        if (scanner.isScanning) {
          scanner.stop()
            .then(() => console.log('Scanner stopped successfully'))
            .catch((err) => console.warn('Failed to stop scanner on unmount:', err));
        }
      }
    };
  }, [isOpen]);

  const handleSuccess = (itemId: string) => {
    setScanResult(itemId);
    setIsScanning(false);

    // Stop scanner immediately on success
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      qrCodeRef.current.stop().catch((err) => console.warn('Error stopping scanner:', err));
    }

    // Play a lovely high pitch "beep" sound using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1.2 kHz beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12); // Beep duration 120ms
    } catch (e) {
      console.log('Audio Context beep ignored', e);
    }

    // Success timeout then call onScan
    setTimeout(() => {
      onScan(itemId);
      onClose();
    }, 800);
  };

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrError(null);

    // If scanning with camera, stop it first to free resources
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      try {
        await qrCodeRef.current.stop();
      } catch (err) {
        console.warn('Could not stop camera scanner for OCR:', err);
      }
    }

    try {
      // Run Tesseract OCR on the chosen image (using English/Numbers model for IDs and barcodes)
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text || '';
      console.log('OCR Result text:', text);

      // Extract all alphanumeric tokens
      const words = text
        .split(/[\s\n\r,;:_/\\]+/)
        .map(w => w.trim().replace(/[^a-zA-Z0-9-]/g, ''))
        .filter(w => w.length >= 3);

      console.log('OCR Extracted tokens:', words);

      // Search tokens for an exact match in the items database
      let matchedId = '';
      for (const word of words) {
        const found = items.find(
          (item) => item.id.toLowerCase() === word.toLowerCase()
        );
        if (found) {
          matchedId = found.id;
          break;
        }
      }

      // Fallback: If no exact item matched, let's pick the first token that looks like a barcode or serial number
      if (!matchedId) {
        const numericOrID = words.find(w => /^[a-zA-Z0-9-]{4,20}$/.test(w));
        if (numericOrID) {
          matchedId = numericOrID;
        } else if (words.length > 0) {
          matchedId = words[0];
        }
      }

      if (matchedId) {
        handleSuccess(matchedId);
      } else {
        setOcrError('لم نتمكن من قراءة أي رقم صنف أو باركود واضح من هذه الصورة. يرجى التأكد من جودة الإضاءة ووضوح الأرقام.');
      }
    } catch (err: any) {
      console.error('OCR error occurred:', err);
      setOcrError('عذراً، حدث خطأ أثناء معالجة الصورة للتعرف على النص.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleClose = async () => {
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      try {
        await qrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner during close:', err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-scale-up">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-500/20 text-blue-400 p-2 rounded-xl">
              <Camera size={20} className="stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm">قارئ الرموز الشريطية (Barcode/OCR)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">مسح باركود ذكي وتعرف ضوئي على الحروف من الصور</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video / Camera mounting view */}
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
          {isOcrProcessing ? (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-white p-4">
              <Loader2 className="animate-spin text-blue-500 mb-3" size={40} />
              <p className="text-sm font-bold animate-pulse">جاري فحص وقراءة النصوص في الصورة (OCR)...</p>
              <p className="text-[10px] text-slate-400 mt-1">يتم الآن تحليل الأرقام والرموز عبر Tesseract.js</p>
            </div>
          ) : cameraError && !ocrError ? (
            <div className="p-6 text-center text-slate-400 max-w-xs space-y-2">
              <AlertCircle size={32} className="mx-auto text-amber-500" />
              <p className="text-xs font-bold leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            <div className="w-full h-full relative">
              {/* html5-qrcode attaches here */}
              <div id="reader" className="w-full h-full overflow-hidden [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
              
              {isScanning && (
                <>
                  {/* Neon laser animation */}
                  <div className="absolute inset-x-4 h-0.5 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-bounce top-1/3 z-10 pointer-events-none" />
                </>
              )}
            </div>
          )}

          {/* OCR Error Display overlay */}
          {ocrError && !isOcrProcessing && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center text-white p-6 z-15">
              <AlertCircle size={36} className="text-rose-500 mb-2" />
              <p className="text-xs font-bold leading-relaxed max-w-xs">{ocrError}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-1.5 px-4 rounded-xl shadow-md cursor-pointer transition-all"
              >
                محاولة التقاط صورة أخرى
              </button>
            </div>
          )}

          {/* Scanned Success Overlay */}
          {scanResult && (
            <div className="absolute inset-0 bg-blue-600/90 flex flex-col items-center justify-center text-white animate-fade-in z-20">
              <div className="bg-white text-blue-600 p-4 rounded-full shadow-lg mb-2 scale-110 transition-transform animate-bounce">
                <Check size={28} className="stroke-[3]" />
              </div>
              <p className="text-sm font-black">تم التعرف على الصنف!</p>
              <p className="text-xs font-mono bg-blue-700/60 px-3 py-1 rounded-full mt-1.5 font-bold">{scanResult}</p>
            </div>
          )}
        </div>

        {/* OCR Trigger Section */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isOcrProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Camera size={15} />
            <span>التقاط صورة الصنف/الباركود لقراءتها بـ OCR 📸</span>
          </button>
          <p className="text-[10px] text-slate-500 text-center font-medium mt-1">
            في حالة تعذر المسح، التقط صورة واضحة لبطاقة المنتج أو الملصق لتحليلها ضوئياً
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleOcrFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>

        {/* Simulator Option - VERY ROBUST FOR PREVIEW/DEMO */}
        <div className="p-5 bg-slate-50 text-right space-y-3">
          <div className="flex items-center gap-1.5 text-blue-600">
            <Sparkles size={14} className="stroke-[2.5]" />
            <span className="text-xs font-extrabold">
              {allowNewCode ? 'محاكي قراءة رمز شريطي جديد / عشوائي:' : 'محاكي المسح السريع للتجربة والمراجعة:'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            {allowNewCode 
              ? 'اضغط على أي كود بالأسفل لمحاكاة مسح رمز باركود جديد تماماً وتعبئته تلقائياً في النموذج:' 
              : 'اختر أي صنف من القائمة أدناه لمحاكاة قراءة الباركود فورياً وسرعة إدراجه في النموذج:'}
          </p>

          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
            {allowNewCode ? (
              <>
                {[
                  { label: 'باركود سلعة 1', code: '6281047239102' },
                  { label: 'باركود سلعة 2', code: '6901234567892' },
                  { label: 'رمز صنف PRD-005', code: 'PRD-005' },
                  { label: 'كود تسلسلي SN-9988', code: 'SN-9988' },
                  { label: 'باركود عشوائي 1', code: 'EAN-889912' },
                  { label: 'باركود عشوائي 2', code: '628990123456' }
                ].map((mock, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuccess(mock.code)}
                    className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold p-2 rounded-xl transition-all text-right flex flex-col justify-between cursor-pointer shadow-2xs"
                  >
                    <span className="truncate block font-semibold">{mock.label}</span>
                    <span className="font-mono text-[9px] text-slate-400 block mt-0.5">{mock.code}</span>
                  </button>
                ))}
              </>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSuccess(item.id)}
                  className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold p-2 rounded-xl transition-all text-right flex flex-col justify-between cursor-pointer shadow-2xs"
                >
                  <span className="truncate block font-semibold">{item.name}</span>
                  <span className="font-mono text-[9px] text-slate-400 block mt-0.5">{item.id}</span>
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
