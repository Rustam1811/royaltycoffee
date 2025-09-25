import React, { useMemo, useState } from "react";

type StoryStudioProps = {
  onCancel: () => void;
  onExport: (payload: { blob: Blob; dataUrl: string }) => void | Promise<void>;
  initialBg?: string;
};

type BackgroundMode = "image" | "gradient" | "color";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const gradients: Record<string, string> = {
  sunrise: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
  ocean: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  forest: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
  violet: "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)",
};

const colors = ["#0f1729", "#111827", "#1f2937", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#f3f4f6"];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function toBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

const StoryStudio: React.FC<StoryStudioProps> = ({ onCancel, onExport, initialBg }) => {
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(initialBg ? "image" : "gradient");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initialBg ?? null);
  const [selectedGradient, setSelectedGradient] = useState<string>(Object.keys(gradients)[0]);
  const [solidColor, setSolidColor] = useState<string>(colors[0]);
  const [overlayText, setOverlayText] = useState<string>("Sunfood Coffee");
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [textSize, setTextSize] = useState<number>(72);

  const previewStyle = useMemo(() => {
    if (backgroundMode === "image" && backgroundImage) {
      return { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" };
    }
    if (backgroundMode === "gradient") {
      return { backgroundImage: gradients[selectedGradient] };
    }
    return { backgroundColor: solidColor };
  }, [backgroundMode, backgroundImage, selectedGradient, solidColor]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBackgroundImage(reader.result);
        setBackgroundMode("image");
      }
    };
    reader.readAsDataURL(file);
  };

  const exportStory = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    if (backgroundMode === "image" && backgroundImage) {
      const img = await loadImage(backgroundImage);
      const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      const offsetX = (CANVAS_WIDTH - width) / 2;
      const offsetY = (CANVAS_HEIGHT - height) / 2;
      ctx.drawImage(img, offsetX, offsetY, width, height);
    } else if (backgroundMode === "gradient") {
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      const css = gradients[selectedGradient];
      const matches = css.match(/#([0-9a-f]{3,6})/gi) ?? ["#0f1729", "#1f2937"];
      const steps = matches.length - 1;
      matches.forEach((color, index) => {
        gradient.addColorStop(steps === 0 ? 0 : index / steps, color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.fillStyle = textColor;
    ctx.font = `${textSize}px "Manrope", "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 20;
    const lines = overlayText.split("\n");
    const lineHeight = textSize * 1.2;
    const startY = CANVAS_HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, CANVAS_WIDTH / 2, startY + index * lineHeight);
    });

    const dataUrl = canvas.toDataURL("image/png", 0.92);
    const blob = await toBlob(dataUrl);
    await onExport({ blob, dataUrl });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Story Studio</h2>
        <p className="text-sm text-slate-500">
          ??????????? ?????? ??? ???????: ????????? ???, ????????? ???????? ??? ???????? ???? ? ???????? ???????.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        {/* Preview */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-[220px] h-[390px] rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative"
            style={previewStyle}
          >
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute inset-6 flex flex-col justify-end">
              <div className="backdrop-blur-sm bg-black/30 rounded-2xl px-4 py-3 text-white text-center whitespace-pre-line">
                {overlayText || "???????? ?????"}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">???????????? (9:16)</div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">??? ???????</h3>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "image", label: "???????????" },
                { key: "gradient", label: "????????" },
                { key: "color", label: "????" },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setBackgroundMode(option.key)}
                  className={`px-3 py-2 rounded-lg border text-sm transition ${
                    backgroundMode === option.key ? "border-slate-900 text-slate-900 bg-slate-100" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {backgroundMode === "image" && (
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span>????????? ??????????? (PNG ??? JPG)</span>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </label>
            )}

            {backgroundMode === "gradient" && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(gradients).map(([key, gradient]) => (
                  <button
                    key={key}
                    type="button"
                    className={`w-16 h-16 rounded-2xl border transition ${selectedGradient === key ? "border-slate-900" : "border-transparent"}`}
                    style={{ backgroundImage: gradient }}
                    onClick={() => setSelectedGradient(key)}
                    aria-label={`???????? ${key}`}
                  />
                ))}
              </div>
            )}

            {backgroundMode === "color" && (
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded-full border transition ${solidColor === color ? "border-slate-900" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSolidColor(color)}
                    aria-label={`???? ${color}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">?????</h3>
            <textarea
              value={overlayText}
              onChange={(event) => setOverlayText(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              rows={3}
            />
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm text-slate-600 flex items-center gap-2">
                ???? ??????
                <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} />
              </label>
              <label className="text-sm text-slate-600 flex items-center gap-2">
                ??????
                <input
                  type="range"
                  min={36}
                  max={120}
                  value={textSize}
                  onChange={(event) => setTextSize(Number(event.target.value))}
                />
                <span className="text-xs text-slate-500 w-8 text-right">{textSize}px</span>
              </label>
            </div>
          </section>

          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            >
              ??????
            </button>
            <button
              type="button"
              onClick={exportStory}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black transition"
            >
              ?????????????? PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryStudio;
