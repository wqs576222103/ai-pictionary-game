import DrawingGame from "../components/drawing-game";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">AI Pictionary</span>
        <h1>你画，Gemini 猜。</h1>
        <p>
          在画布上自由作画，点击按钮后由服务端调用 Gemini REST API 识别画面内容。
          整个调用链只走后端 `fetch`，不接任何 SDK。
        </p>
      </section>
      <DrawingGame />
    </main>
  );
}
