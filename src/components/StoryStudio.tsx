import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer } from "react-konva";
import Konva from "konva";
import { nanoid } from "nanoid";
import { XMarkIcon, PhotoIcon, CameraIcon, PlusIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

type TextNode = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  rotation: number;
  draggable: boolean;
  fontFamily: string;
  align: "left" | "center" | "right";
};

type Props = {
  onCancel: () => void;
  onExport: (out: { blob: Blob; dataUrl: string }) => void | Promise<void>;
  initialBg?: string; // dataUrl/URL, опционально
};

const CANVAS_W = 1080;   // 9:16
const CANVAS_H = 1920;

const PALETTE = ["#ffffff", "#F5B301", "#FF5A5F", "#10B981", "#60A5FA", "#111827"];

const useUrlImage = (url?: string) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = url;
    
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);
  
  return img;
};
const toBlobFromDataURL = async (dataUrl: string): Promise<Blob> =>
  await (await fetch(dataUrl)).blob();

const ToolbarButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = "", ...rest }) => (
  <button
    {...rest}
    className={`px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 transition ${className}`}
    style={{ borderColor: "rgb(226 232 240)", color: "#0E1A2B" }}
  >
    {children}
  </button>
);
const StoryStudio: React.FC<Props> = ({ onCancel, onExport, initialBg }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgDataUrl, setBgDataUrl] = useState<string | undefined>(initialBg);
  const [texts, setTexts] = useState<TextNode[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const bgImg = useUrlImage(bgDataUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (trRef.current && selectedId) {
      const stage = stageRef.current;
      const node = stage?.findOne(`#${selectedId}`);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, texts]);

  const addText = () => {
    const id = nanoid();
    setTexts((t) => [
      ...t,
      {
        id,
        text: "Новый текст",
        x: CANVAS_W / 2 - 200,
        y: CANVAS_H / 2 - 50,
        fontSize: 72,
        fill: "#ffffff",
        rotation: 0,
        draggable: true,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial",
        align: "center",
      },
    ]);
    setSelectedId(id);
  };

  const updateText = (id: string, patch: Partial<TextNode>) => {
    setTexts((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setTexts((arr) => arr.filter((t) => t.id !== selectedId));
    setSelectedId(null);
  };

  const openFile = () => fileRef.current?.click();

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    // Clean up previous blob URL if exists
    if (bgDataUrl && bgDataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(bgDataUrl);
    }
    
    const url = URL.createObjectURL(f);
    setBgDataUrl(url);
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 9 / 16 }, audio: false });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (e) {
      console.error(e);
      setIsCapturing(false);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const ctx = canvas.getContext("2d")!;
    // вписываем с сохранением cover
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(CANVAS_W / vw, CANVAS_H / vh);
    const sw = vw * scale;
    const sh = vh * scale;
    const sx = (CANVAS_W - sw) / 2;
    const sy = (CANVAS_H - sh) / 2;
    ctx.drawImage(video, sx, sy, sw, sh);

    const data = canvas.toDataURL("image/png");
    stopCamera();
    setBgDataUrl(data);
  };

  const stopCamera = () => {
    setIsCapturing(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => {
    stopCamera();
    // Clean up blob URL on unmount
    if (bgDataUrl && bgDataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(bgDataUrl);
    }
  }, [bgDataUrl]);
  const exportImage = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!stage) return;

    // скрыть трансформер во время экспорта
    trRef.current?.nodes([]);
    trRef.current?.getLayer().batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const blob = await toBlobFromDataURL(dataUrl);

    await onExport({ blob, dataUrl });
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 border-b gap-2" style={{ borderColor: "rgb(226 232 240)" }}>
        <div className="flex items-center gap-2">
          <span className="font-semibold">StoryStudio</span>
          <span className="text-sm text-slate-500">Редактор</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ToolbarButton onClick={openFile}>
            <span className="inline-flex items-center gap-2"><PhotoIcon className="w-4 h-4" /> <span className="hidden sm:inline">Галерея</span></span>
          </ToolbarButton>
          <ToolbarButton onClick={isCapturing ? captureFrame : startCamera}>
            <span className="inline-flex items-center gap-2"><CameraIcon className="w-4 h-4" /> <span className="hidden sm:inline">{isCapturing ? "Снять кадр" : "Камера"}</span></span>
          </ToolbarButton>
          <ToolbarButton onClick={addText}>
            <span className="inline-flex items-center gap-2"><PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">Текст</span></span>
          </ToolbarButton>
          <button 
            onClick={exportImage} 
            className="px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1 sm:flex-none"
          >
            <span className="inline-flex items-center gap-2 justify-center"><ArrowDownTrayIcon className="w-4 h-4" /> Опубликовать</span>
          </button>
          <button onClick={onCancel} className="p-2 rounded-lg border hover:bg-slate-50" style={{ borderColor: "rgb(226 232 240)" }}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera */}
      {isCapturing && (
        <div className="p-2 sm:p-3">
          <video ref={videoRef} className="w-full max-h-[60vh] bg-black rounded-xl mx-auto" style={{ maxWidth: '360px', aspectRatio: '9/16' }} muted playsInline />
          <div className="mt-2 flex gap-2 justify-center">
            <ToolbarButton onClick={captureFrame}>Снять кадр</ToolbarButton>
            <ToolbarButton onClick={stopCamera}>Отмена</ToolbarButton>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="p-2 sm:p-4 flex justify-center">
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          <div className="relative w-full bg-black rounded-2xl shadow overflow-hidden" style={{ aspectRatio: '9/16' }}>
            <Stage
              ref={stageRef}
              width={360}
              height={640}
              scaleX={1}
              scaleY={1}
              className="w-full h-full"
              style={{ display: 'block' }}
              onMouseDown={(e) => {
                const clickedEmpty = e.target === e.target.getStage();
                if (clickedEmpty) setSelectedId(null);
              }}
              onTouchStart={(e) => {
                const clickedEmpty = e.target === e.target.getStage();
                if (clickedEmpty) setSelectedId(null);
              }}
          >
            <Layer>
              {/* фон */}
              {bgImg ? (
                (() => {
                  // Вычисляем размеры для cover-режима (как object-fit: cover)
                  const imageAspect = bgImg.width / bgImg.height;
                  const canvasAspect = 360 / 640;
                  
                  let renderWidth, renderHeight, offsetX = 0, offsetY = 0;
                  
                  if (imageAspect > canvasAspect) {
                    // Изображение шире канваса - масштабируем по высоте
                    renderHeight = 640;
                    renderWidth = renderHeight * imageAspect;
                    offsetX = (360 - renderWidth) / 2;
                  } else {
                    // Изображение выше канваса - масштабируем по ширине
                    renderWidth = 360;
                    renderHeight = renderWidth / imageAspect;
                    offsetY = (640 - renderHeight) / 2;
                  }
                  
                  return (
                    <KonvaImage
                      image={bgImg}
                      x={offsetX}
                      y={offsetY}
                      width={renderWidth}
                      height={renderHeight}
                      listening={false}
                    />
                  );
                })()
              ) : (
                <KonvaText
                  text="Фон не выбран — камера или галерея"
                  x={20}
                  y={300}
                  width={320}
                  fontSize={18}
                  align="center"
                  fill="#94a3b8"
                />
              )}

              {/* тексты */}
              {texts.map((t) => (
                <React.Fragment key={t.id}>
                  <KonvaText
                    id={t.id}
                    text={t.text}
                    x={t.x / (CANVAS_W / 360)}
                    y={t.y / (CANVAS_H / 640)}
                    fontSize={t.fontSize / (CANVAS_W / 360)} // масштабируем в предпросмотре
                    fill={t.fill}
                    rotation={t.rotation}
                    fontFamily={t.fontFamily}
                    align={t.align}
                    draggable
                    onDragEnd={(e) => {
                      const scaleX = CANVAS_W / 360;
                      const scaleY = CANVAS_H / 640;
                      updateText(t.id, {
                        x: e.target.x() * scaleX,
                        y: e.target.y() * scaleY,
                      });
                    }}
                    onClick={() => setSelectedId(t.id)}
                    onTap={() => setSelectedId(t.id)}
                  />
                  {selectedId === t.id && (
                    <Transformer
                      ref={trRef}
                      rotateEnabled
                      enabledAnchors={["middle-left", "middle-right"]}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 20) return oldBox;
                        return newBox;
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Layer>
          </Stage>
          </div>
        </div>
      </div>

      {/* Панель свойств выбранного текста */}
      {selectedId && (
        <div className="mx-2 sm:mx-4 mb-4 p-3 rounded-xl border" style={{ borderColor: "rgb(226 232 240)" }}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className="text-sm text-slate-600 w-24">Текст</span>
              <input
                className="flex-1 px-3 py-2 rounded-lg border w-full"
                style={{ borderColor: "rgb(226 232 240)" }}
                value={texts.find((t) => t.id === selectedId)?.text || ""}
                onChange={(e) => updateText(selectedId, { text: e.target.value })}
              />
              <button className="px-3 py-2 rounded-lg border w-full sm:w-auto" onClick={removeSelected} style={{ borderColor: "rgb(226 232 240)" }}>
                Удалить
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
              <span className="text-sm text-slate-600 w-24">Цвет</span>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateText(selectedId, { fill: c })}
                    className="w-8 h-8 rounded-full border"
                    style={{ background: c, borderColor: "rgb(226 232 240)" }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm text-slate-600 w-24">Размер</span>
              <input
                type="range"
                min={24}
                max={144}
                value={texts.find((t) => t.id === selectedId)?.fontSize || 72}
                onChange={(e) => updateText(selectedId, { fontSize: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm w-12 text-right">{texts.find((t) => t.id === selectedId)?.fontSize || 72}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm text-slate-600 w-24">Поворот</span>
              <input
                type="range"
                min={-45}
                max={45}
                value={texts.find((t) => t.id === selectedId)?.rotation || 0}
                onChange={(e) => updateText(selectedId, { rotation: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm w-12 text-right">{texts.find((t) => t.id === selectedId)?.rotation || 0}°</span>
            </div>
          </div>
        </div>
      )}

      {/* скрытые инпуты */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />
    </div>
  );
};

export default StoryStudio;