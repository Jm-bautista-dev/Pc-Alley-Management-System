"use client";

function getCssVar(name, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function getChartTheme() {
  const textMain = getCssVar("--text-main-rgb", "255, 255, 255");
  const panel = getCssVar("--brand-panel-rgb", "8, 11, 18");
  const border = getCssVar("--brand-border-rgb", "255, 255, 255");
  const bgBase = getCssVar("--brand-bgbase-rgb", "10, 10, 10");

  return {
    tickColor: `rgba(${textMain}, 0.85)`,
    gridColor: `rgba(${textMain}, 0.12)`,
    tooltipBodyColor: `rgba(${textMain}, 0.9)`,
    tooltipBackgroundColor: `rgba(${panel}, 0.94)`,
    tooltipTitleColor: `rgb(${textMain})`,
    tooltipBorderColor: `rgba(${border}, 0.18)`,
    pointBorderColor: `rgb(${bgBase})`,
    mutedLineColor: `rgba(${textMain}, 0.18)`,
  };
}
