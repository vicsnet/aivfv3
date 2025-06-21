"use client";

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
});

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram = ({ chart }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current && chart) {
        try {
          const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}`, chart);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error("Mermaid render error:", error);
          containerRef.current.innerHTML = 'Error rendering diagram.';
        }
      }
    };
    renderDiagram();
  }, [chart]);

  return <div ref={containerRef} className="mermaid-diagram w-full flex justify-center" />;
};

export default MermaidDiagram; 