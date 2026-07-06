import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
  block?: boolean;
}

function MathText({ children }: { children: string }) {
  // Normalize LaTeX delimiters commonly returned by LLMs
  let normalized = children;
  normalized = normalized.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
  normalized = normalized.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // Simple regex to find LaTeX between $...$ or $$...$$
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function KaTeXRenderer({ content, block = false }: Props) {
  if (block) {
    return <BlockMath math={content} />;
  }

  return (
    <div className="react-markdown-container w-full break-words select-text">
      <ReactMarkdown
        components={{
          text: (props: any) => <MathText>{props.children || props.value || ''}</MathText>,
          h1: ({ children }) => <h1 className="text-sm font-black text-primary mt-4 mb-2 uppercase tracking-wide">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xs font-black text-primary mt-3 mb-1.5 uppercase tracking-wider">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-black text-slate-200 mt-2.5 mb-1 uppercase tracking-widest">{children}</h3>,
          h4: ({ children }) => <h4 className="text-[10px] font-black text-slate-350 mt-2 mb-1 uppercase tracking-widest">{children}</h4>,
          p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0 text-slate-350 font-semibold text-xs md:text-sm">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-400">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-400">{children}</ol>,
          li: ({ children }) => <li className="text-xs md:text-sm font-semibold leading-relaxed mb-1 last:mb-0">{children}</li>,
          strong: ({ children }) => <strong className="font-extrabold text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
          code: ({ children }) => (
            <code className="bg-slate-950/80 px-1.5 py-0.5 rounded text-xs font-mono text-primary-hover border border-primary/10 select-all font-semibold inline-block">
              {children}
            </code>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
