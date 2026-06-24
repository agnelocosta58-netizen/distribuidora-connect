import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Camera, CameraOff } from "lucide-react";
import { toast } from "sonner";

export interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  title?: string;
}

/** Camera-based barcode scanner using @zxing/browser. Also accepts manual entry. */
export function BarcodeScanner({ open, onOpenChange, onDetected, title = "Ler código de barras" }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setCameraOn(false);
      setManual("");
      setError(null);
      return;
    }
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!devices.length) {
          setError("Nenhuma câmera encontrada. Use a entrada manual ou um leitor USB/Bluetooth.");
          return;
        }
        const back = devices.find((d) => /back|traseira|environment/i.test(d.label)) ?? devices[devices.length - 1];
        if (!videoRef.current || cancelled) return;
        const controls = await reader.decodeFromVideoDevice(back.deviceId, videoRef.current, (result) => {
          if (result) {
            const text = result.getText();
            controls.stop();
            controlsRef.current = null;
            setCameraOn(false);
            onDetected(text);
            onOpenChange(false);
          }
        });
        controlsRef.current = controls;
        setCameraOn(true);
      } catch (e: any) {
        setError(e?.message ?? "Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      }
    })();
    return () => { cancelled = true; controlsRef.current?.stop(); controlsRef.current = null; };
  }, [open, onDetected, onOpenChange]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return toast.error("Digite ou bipe um código");
    onDetected(code);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5" /> {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden grid place-items-center">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {!cameraOn && !error && (
              <div className="absolute inset-0 grid place-items-center text-white/70 text-sm gap-2">
                <Camera className="h-8 w-8 opacity-50" />
                <span>Iniciando câmera…</span>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 grid place-items-center text-white/80 text-sm p-4 text-center gap-2">
                <CameraOff className="h-8 w-8 opacity-60" />
                <span>{error}</span>
              </div>
            )}
            {cameraOn && (
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-primary shadow-[0_0_12px_var(--color-primary)] animate-pulse" />
            )}
          </div>

          <form onSubmit={submitManual} className="space-y-2">
            <Label className="text-xs">Ou digite/bipe o código (leitor USB/Bluetooth)</Label>
            <div className="flex gap-2">
              <Input autoFocus value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ex.: 7891000100103" />
              <Button type="submit">Usar</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Leitores USB/Bluetooth funcionam como teclado — basta o campo estar focado.</p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Input that supports manual entry + camera button + auto-detect of USB/Bluetooth scanner Enter input. */
export function BarcodeInput({
  value, onChange, onScan, placeholder = "Código de barras", className,
}: {
  value: string;
  onChange: (v: string) => void;
  onScan?: (code: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [scanOpen, setScanOpen] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onScan?.(value.trim());
    }
  }

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} />
      <Button type="button" variant="outline" size="icon" onClick={() => setScanOpen(true)} title="Escanear com câmera">
        <ScanLine className="h-4 w-4" />
      </Button>
      <BarcodeScanner
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDetected={(code) => { onChange(code); onScan?.(code); }}
      />
    </div>
  );
}
