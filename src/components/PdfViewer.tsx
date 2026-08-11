import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, AlertCircle, Loader2 } from 'lucide-react';

// Configure pdfjs worker
const version = pdfjsLib.version || '3.11.174';
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  url: string;
  title?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF Document
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setPageNum(1);

    const loadPdf = async () => {
      if (!url) {
        setError('No se proporcionó un documento PDF válido.');
        setLoading(false);
        return;
      }

      try {
        let loadingTask: any;

        if (url.startsWith('data:')) {
          // Convert base64 to Uint8Array
          const base64Data = url.includes(',') ? url.split(',')[1] : url;
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else {
          loadingTask = pdfjsLib.getDocument({ url });
        }

        const pdf = await loadingTask.promise;
        if (!active) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!active) return;
        console.error('Error loading PDF with pdfjs:', err);
        setError('No se pudo procesar el PDF directamente.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
    };
  }, [url]);

  // Render Current Page to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        // Cancel previous render task if it exists
        if (renderTask) {
          renderTask.cancel();
        }

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale, rotation]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden select-none border border-slate-700/50 shadow-inner">
      {/* Controls Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center justify-between text-slate-200 text-[10px] sm:text-xs shrink-0 flex-wrap gap-2 z-10 shadow-md">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={pageNum <= 1 || loading}
            onClick={() => setPageNum((prev) => Math.max(prev - 1, 1))}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            title="Página Anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 font-black px-2 py-1 bg-slate-950/40 rounded-lg text-sky-400 min-w-[60px] justify-center">
            <span>{pageNum}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{numPages || '-'}</span>
          </div>
          <button
            type="button"
            disabled={pageNum >= numPages || loading}
            onClick={() => setPageNum((prev) => Math.min(prev + 1, numPages))}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            title="Página Siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            disabled={scale <= 0.4 || loading}
            onClick={() => setScale((s) => Math.max(s - 0.2, 0.4))}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            title="Alejar"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 h-4" />
          </button>
          <span className="font-mono text-[10px] sm:text-[11px] w-10 sm:w-12 text-center text-slate-400 font-bold">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            disabled={scale >= 4 || loading}
            onClick={() => setScale((s) => Math.min(s + 0.2, 4))}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            title="Acercar"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5 sm:mx-1" />
          <button
            type="button"
            disabled={loading}
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Girar"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 h-4" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2">
           <button
            type="button"
            onClick={() => {
              const link = document.createElement('a');
              link.href = url;
              link.download = title || 'documento.pdf';
              link.click();
            }}
            className="px-2.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-lg text-[10px] font-black transition-colors flex items-center gap-1.5 cursor-pointer border border-sky-500/30"
          >
            Descargar
          </button>
        </div>
      </div>

      {/* Canvas / Render Area */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-950/90 relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/60 backdrop-blur-sm text-sky-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="text-xs font-black tracking-widest uppercase text-slate-300">Procesando PDF...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 text-rose-400 my-12 text-center max-w-sm p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20">
            <AlertCircle className="w-12 h-12" />
            <div className="space-y-1">
              <p className="text-sm font-black uppercase">Error de Lectura</p>
              <p className="text-xs text-rose-300/80 font-bold leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <canvas
            ref={canvasRef}
            className="rounded shadow-2xl bg-white transition-all duration-300 ease-out origin-top"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              imageRendering: 'crisp-edges'
            }}
          />
        )}
      </div>
    </div>
  );
};
