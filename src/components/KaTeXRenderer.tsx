import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Props {
  content: string;
  block?: boolean;
}

export function KaTeXRenderer({ content, block = false }: Props) {
  // Normalize LaTeX delimiters commonly returned by LLMs
  let normalized = content;
  normalized = normalized.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
  normalized = normalized.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // Simple regex to find LaTeX between $...$ or $$...$$
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        
        // For non-LaTeX parts, parse markdown backticks for inline code blocks
        const subParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>
            {subParts.map((subPart, j) => {
              if (subPart.startsWith('`') && subPart.endsWith('`')) {
                return (
                  <code 
                    key={j} 
                    className="bg-slate-950/70 border border-primary/15 text-primary-hover px-1.5 py-0.5 rounded-lg font-mono text-[13px] mx-0.5 inline-block font-semibold select-all"
                  >
                    {subPart.slice(1, -1)}
                  </code>
                );
              }
              return <span key={j}>{subPart}</span>;
            })}
          </span>
        );
      })}
    </span>
  );
}
