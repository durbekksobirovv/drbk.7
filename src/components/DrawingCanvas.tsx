import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { syncService, StrokeData } from '../lib/syncService';

interface DrawingCanvasProps {
  roomId: string;
  userId: string;
  color: string;
  brushSize: number;
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line';
  canvasBg: 'white' | 'grid' | 'sepia' | 'dark';
}

export default function DrawingCanvas({ roomId, userId, color, brushSize, tool, canvasBg }: DrawingCanvasProps) {
  const [lines, setLines] = useState<StrokeData[]>([]);
  const isDrawing = useRef(false);
  const stageRef = useRef<any>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);

  // Adapt the eraser color to match the canvas background perfectly!
  const getEraserColor = () => {
    switch (canvasBg) {
      case 'grid': return '#f8fafc'; // Matches bg-slate-50
      case 'sepia': return '#f4efe2'; // Matches custom warm paper shade
      case 'dark': return '#0f172a'; // Matches bg-slate-900
      default: return '#ffffff'; // Classic plain white
    };
  };

  // Subscribe to drawing strokes in real-time
  useEffect(() => {
    const unsubscribe = syncService.subscribeStrokes(roomId, (remoteStrokes) => {
      setLines(remoteStrokes);
    });
    return () => unsubscribe();
  }, [roomId]);

  // Handle responsive window scaling
  useEffect(() => {
    const handleResize = () => {
      setStageSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle download event
  useEffect(() => {
    const handleDownload = () => {
      if (!stageRef.current) return;
      try {
        const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `paint-collab-${roomId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error("Canvas export failed:", e);
      }
    };
    window.addEventListener('download-canvas', handleDownload);
    return () => window.removeEventListener('download-canvas', handleDownload);
  }, [roomId]);

  const onMouseDown = (e: any) => {
    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    startPointRef.current = { x: pos.x, y: pos.y };
    setCurrentPoints([pos.x, pos.y]);
  };

  const onMouseMove = (e: any) => {
    if (!isDrawing.current || !startPointRef.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    if (tool === 'pen' || tool === 'eraser') {
      setCurrentPoints((prev) => [...prev, point.x, point.y]);
    } else {
      // Shapes: [startX, startY, currentX, currentY]
      setCurrentPoints([startPointRef.current.x, startPointRef.current.y, point.x, point.y]);
    }
  };

  const onMouseUp = async () => {
    if (!isDrawing.current || currentPoints.length < 2) return;
    isDrawing.current = false;

    const strokeColor = tool === 'eraser' ? getEraserColor() : color;

    // Save final mouse position for shapes if they didn't move
    let finalPoints = currentPoints;
    if ((tool === 'rectangle' || tool === 'circle' || tool === 'line') && currentPoints.length < 4) {
      finalPoints = [currentPoints[0], currentPoints[1], currentPoints[0], currentPoints[1]];
    }

    try {
      await syncService.addStroke(roomId, userId, {
        points: finalPoints,
        color: strokeColor,
        brushSize,
        tool,
      });
    } catch (error) {
      console.error("Xona chizig'ini yuborishda xato:", error);
    }
    setCurrentPoints([]);
    startPointRef.current = null;
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-transparent overflow-hidden cursor-crosshair z-0">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
      >
        <Layer>
          {lines.map((line) => {
            if (line.tool === 'rectangle') {
              return (
                <Rect
                  key={line.id}
                  x={line.points[0]}
                  y={line.points[1]}
                  width={line.points[2] - line.points[0]}
                  height={line.points[3] - line.points[1]}
                  stroke={line.color}
                  strokeWidth={line.brushSize}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            }
            if (line.tool === 'circle') {
              const dx = (line.points[2] ?? line.points[0]) - line.points[0];
              const dy = (line.points[3] ?? line.points[1]) - line.points[1];
              const radius = Math.sqrt(dx * dx + dy * dy);
              return (
                <Circle
                  key={line.id}
                  x={line.points[0]}
                  y={line.points[1]}
                  radius={radius}
                  stroke={line.color}
                  strokeWidth={line.brushSize}
                />
              );
            }
            if (line.tool === 'line') {
              return (
                <Line
                  key={line.id}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.brushSize}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            }
            // Pen and Eraser
            return (
              <Line
                key={line.id}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' && canvasBg === 'white' ? 'destination-out' : 'source-over'
                }
              />
            );
          })}

          {currentPoints.length > 0 && (
            <>
              {tool === 'rectangle' && (
                <Rect
                  x={currentPoints[0]}
                  y={currentPoints[1]}
                  width={(currentPoints[2] ?? currentPoints[0]) - currentPoints[0]}
                  height={(currentPoints[3] ?? currentPoints[1]) - currentPoints[1]}
                  stroke={color}
                  strokeWidth={brushSize}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.85}
                />
              )}
              {tool === 'circle' && (
                <Circle
                  x={currentPoints[0]}
                  y={currentPoints[1]}
                  radius={(() => {
                    const dx = (currentPoints[2] ?? currentPoints[0]) - currentPoints[0];
                    const dy = (currentPoints[3] ?? currentPoints[1]) - currentPoints[1];
                    return Math.sqrt(dx * dx + dy * dy);
                  })()}
                  stroke={color}
                  strokeWidth={brushSize}
                  opacity={0.85}
                />
              )}
              {tool === 'line' && (
                <Line
                  points={[
                    currentPoints[0],
                    currentPoints[1],
                    currentPoints[2] ?? currentPoints[0],
                    currentPoints[3] ?? currentPoints[1]
                  ]}
                  stroke={color}
                  strokeWidth={brushSize}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.85}
                />
              )}
              {(tool === 'pen' || tool === 'eraser') && (
                <Line
                  points={currentPoints}
                  stroke={tool === 'eraser' ? getEraserColor() : color}
                  strokeWidth={brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={tool === 'eraser' ? 1 : 0.85}
                />
              )}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
