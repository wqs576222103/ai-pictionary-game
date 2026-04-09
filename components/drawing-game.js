"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const DEFAULT_COLOR = "#202020";
const ERASER_COLOR = "#fffefb";

const isProduction = process.env.NODE_ENV === "production";

const baseUrl = isProduction ? "./" : "/";

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export default function DrawingGame() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const fullscreenCanvasRef = useRef(null);
  const fullscreenContainerRef = useRef(null);

  const [brushColor, setBrushColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(6);
  const [guess, setGuess] = useState("还没有猜测结果");
  const [reasoning, setReasoning] = useState("先画点什么，再让 AI 来猜。");
  const [attempts, setAttempts] = useState(0);
  const [description, setDescription] = useState("");
  const [history, setHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedModel, setSelectedModel] = useState("Qwen/Qwen3-VL-8B-Instruct");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    context.fillStyle = "#fffefb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isFullscreen && fullscreenCanvasRef.current) {
      const fullscreenCanvas = fullscreenCanvasRef.current;
      const context = fullscreenCanvas.getContext("2d");

      fullscreenCanvas.width = CANVAS_WIDTH;
      fullscreenCanvas.height = CANVAS_HEIGHT;

      // Copy content from original canvas
      context.drawImage(canvasRef.current, 0, 0);

      context.lineCap = "round";
      context.lineJoin = "round";

      // Resize fullscreen canvas to fill screen with aspect ratio maintained
      const resizeFullscreen = () => {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const scaleX = screenWidth / CANVAS_WIDTH;
        const scaleY = screenHeight / CANVAS_HEIGHT;
        const scale = Math.max(scaleX, scaleY);
        fullscreenCanvas.style.width = `${CANVAS_WIDTH * scale}px`;
        fullscreenCanvas.style.height = `${CANVAS_HEIGHT * scale}px`;
      };

      resizeFullscreen();
      window.addEventListener("resize", resizeFullscreen);
      window.addEventListener("orientationchange", resizeFullscreen);
      return () => {
        window.removeEventListener("resize", resizeFullscreen);
        window.removeEventListener("orientationchange", resizeFullscreen);
      };
    }
  }, [isFullscreen]);

  const confirmFullscreen = () => {
    const originalContext = canvasRef.current.getContext("2d");
    originalContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    originalContext.drawImage(fullscreenCanvasRef.current, 0, 0);
    setIsFullscreen(false);
  };

  const cancelFullscreen = () => {
    setIsFullscreen(false);
  };

  const getCurrentCanvas = () => {
    return isFullscreen ? fullscreenCanvasRef.current : canvasRef.current;
  };

  const drawSegment = (from, to) => {
    const canvas = getCurrentCanvas();
    const context = canvas.getContext("2d");
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  };

  const getCanvasPoint = (event) => {
    const canvas = getCurrentCanvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    if (isMobile && !isFullscreen) {
      setIsFullscreen(true);
      return;
    }
    const point = getCanvasPoint(event);
    drawingRef.current = true;
    lastPointRef.current = point;
    drawSegment(point, point);
  };

  const handlePointerMove = (event) => {
    if (!drawingRef.current || !lastPointRef.current) {
      return;
    }

    const point = getCanvasPoint(event);
    drawSegment(lastPointRef.current, point);
    lastPointRef.current = point;
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = getCurrentCanvas();
    const context = canvas.getContext("2d");
    context.fillStyle = "#fffefb";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setGuess("还没有猜测结果");
    setReasoning("画面已清空，可以重新开始。");
    setError("");
  };

  const useEraser = () => {
    setBrushColor(ERASER_COLOR);
  };

  const usePen = () => {
    setBrushColor(DEFAULT_COLOR);
  };

  const randomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const submitGuess = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const canvas = getCurrentCanvas();
      const imageDataUrl = canvas.toDataURL("image/png");
      const response = await fetch(`${baseUrl}api/guess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageDataUrl, description: description.trim(), model: selectedModel }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "猜测失败");
      }

      setGuess(result.guess);
      setReasoning(result.reasoning);
      setAttempts((value) => value + 1);
      setHistory((items) => [
        {
          id: `${Date.now()}-${randomNumber(1000, 9999)}`,
          guess: result.guess,
          reasoning: result.reasoning,
          description: description.trim(),
          createdAt: new Date().toISOString()
        },
        ...items
      ].slice(0, 6));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="game-grid">
        <div className="panel canvas-panel">
          <div className="tool-row" style={{marginBottom: 10, justifyContent: "flex-end"}}>
            <button className="ghost-button inline-button" type="button" onClick={clearCanvas}>
              清空
            </button>
            <button
              className="primary-button inline-button"
              type="button"
              onClick={submitGuess}
              disabled={isSubmitting}
            >
              {isSubmitting ? "AI 猜测中..." : "让 AI 猜"}
            </button>
          </div>
          <div className="canvas-wrap" ref={containerRef}>
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          <div className="toolbar">

            <div className="tool-row">
              <button className="tool-chip inline-button" type="button" onClick={usePen}>
                画笔
              </button>
              <button className="tool-chip inline-button" type="button" onClick={useEraser}>
                橡皮擦
              </button>
              <label className="tool-chip">
                笔触 {brushSize}
                <input
                  aria-label="笔触大小"
                  type="range"
                  min="2"
                  max="36"
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                />
              </label>
              <label className="tool-chip">
                识别模型
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                >
                  <option value="Qwen/Qwen3-VL-235B-A22B-Instruct">Qwen/Qwen3-VL-235B-A22B-Instruct</option>
                  <option value="moonshotai/Kimi-K2.5">moonshotai/Kimi-K2.5</option>
                  <option value="Qwen/Qwen3-VL-8B-Instruct">Qwen/Qwen3-VL-8B-Instruct</option>
                </select>
              </label>
            </div>
            <div className="tool-row">
              <label className="tool-chip description-field">
                补充说明
                <textarea
                  aria-label="对图形的补充说明"
                  placeholder="可输入类别、场景提示，不可涉及要画的对象名称"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                />
              </label>
            </div>

          </div>


        </div>

        <aside className="panel side-panel">
          <div className="status-card">
            <h2>当前猜测</h2>
            <div className="guess-text">{guess}</div>
            <div className="muted">{reasoning}</div>
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          <div className="status-card">
            <h3>本局状态</h3>
            <div className="meta-list">
              <div className="meta-item">
                <span className="muted">累计猜测次数</span>
                <strong>{attempts}</strong>
              </div>
            </div>
          </div>

          <div className="status-card">
            <h4>最近记录</h4>
            <div className="history-list">
              {history.length === 0 ? (
                <div className="muted">还没有记录。</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="history-item">
                    <strong>{item.guess}</strong>
                    {item.description ? (
                      <div className="muted">说明: {item.description}</div>
                    ) : null}
                    <div className="muted">{item.reasoning}</div>
                    <div className="muted">{formatTime(item.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      {isFullscreen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            ref={fullscreenContainerRef}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <canvas
              ref={fullscreenCanvasRef}
              className="drawing-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              className="primary-button"
              onClick={confirmFullscreen}
            >
              确认
            </button>
            <button
              className="ghost-button"
              onClick={cancelFullscreen}
              style={{background: '#fff'}}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </>
  );
}
