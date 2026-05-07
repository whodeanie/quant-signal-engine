import type { AICommentary } from "@/lib/types";

export function CommentaryPanel({ commentary }: { commentary: AICommentary }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Analyst notes</h3>
        <span className="tag">
          {commentary.fromModel ? "Llama 3.3 70B (Groq)" : "Deterministic fallback"}
        </span>
      </div>
      <p className="text-ink-100 leading-relaxed whitespace-pre-line">{commentary.paragraph}</p>
      <p className="subtle mt-3">
        Computer generated commentary. Not financial advice. Strategy performance is path dependent.
      </p>
    </div>
  );
}
