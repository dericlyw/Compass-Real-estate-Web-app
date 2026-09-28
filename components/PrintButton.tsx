"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn">
      Print / save PDF
    </button>
  );
}
