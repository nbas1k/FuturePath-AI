"use client";

// Печать или сохранение страницы как PDF средствами браузера
export function PrintButton() {
  return <button className="btn-primary print:hidden" onClick={() => window.print()}>Распечатать или сохранить в PDF</button>;
}
