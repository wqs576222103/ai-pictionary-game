import DrawingGame from "../components/drawing-game";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">AI Pictionary</span>
        <h1>你画，AI 猜。</h1>
      </section>
      <DrawingGame />
    </main>
  );
}
