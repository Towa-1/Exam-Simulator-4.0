import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
  block?: boolean;
}

function cleanLatex(rawMath: string): string {
  if (!rawMath) return '';
  let cleaned = rawMath.trim();
  // Unescape double backslashes if LLM returned JSON-escaped slashes
  cleaned = cleaned.replace(/\\\\/g, '\\');
  return cleaned;
}

function SafeInlineMath({ math }: { math: string }) {
  const cleaned = cleanLatex(math);
  if (!cleaned) return null;
  return (
    <span className="inline-flex items-center justify-center mx-0.5 my-0.5 px-0.5 py-0.5 bg-slate-900/40 rounded text-slate-100 font-normal">
      <InlineMath
        math={cleaned}
        renderError={() => (
          <code className="text-amber-300 font-mono text-xs px-1 py-0.5 bg-amber-950/40 rounded border border-amber-500/20">
            ${cleaned}$
          </code>
        )}
      />
    </span>
  );
}

function SafeBlockMath({ math }: { math: string }) {
  const cleaned = cleanLatex(math);
  if (!cleaned) return null;
  return (
    <div className="my-3 py-2 px-3 bg-slate-950/60 rounded-xl border border-primary/20 overflow-x-auto custom-scrollbar flex items-center justify-center">
      <BlockMath
        math={cleaned}
        renderError={() => (
          <code className="text-amber-300 font-mono text-xs p-2 bg-amber-950/40 rounded block border border-amber-500/20">
            $${cleaned}$$
          </code>
        )}
      />
    </div>
  );
}

function FormattedSegment({ text }: { text: string }) {
  if (!text) return null;
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-sm font-black text-primary mt-4 mb-2 uppercase tracking-wide">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-black text-primary mt-3 mb-1.5 uppercase tracking-wider">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-black text-slate-200 mt-2.5 mb-1 uppercase tracking-widest">{children}</h3>,
        h4: ({ children }) => <h4 className="text-[10px] font-black text-slate-350 mt-2 mb-1 uppercase tracking-widest">{children}</h4>,
        p: ({ children }) => <span className="leading-relaxed text-slate-200 font-medium text-xs md:text-sm">{children}</span>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-300">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-300">{children}</ol>,
        li: ({ children }) => <li className="text-xs md:text-sm font-semibold leading-relaxed mb-1 last:mb-0">{children}</li>,
        strong: ({ children }) => <strong className="font-extrabold text-primary">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
        code: ({ inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const contentStr = String(children || '');
          const isBlock = !inline && (match || contentStr.includes('\n') || contentStr.length > 40);

          if (isBlock) {
            return (
              <div className="my-3 rounded-2xl bg-slate-950/90 border border-primary/30 overflow-hidden shadow-xl text-left">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-primary/20 text-[11px] font-mono font-bold text-primary/80">
                  <span>{match ? match[1].toUpperCase() : 'CODE BLOCK'}</span>
                </div>
                <pre className="p-4 overflow-x-auto text-xs md:text-sm font-mono text-slate-200 leading-relaxed custom-scrollbar whitespace-pre">
                  <code>{children}</code>
                </pre>
              </div>
            );
          }
          return (
            <code className="bg-slate-950/90 px-2 py-0.5 rounded-md text-xs font-mono text-primary-hover border border-primary/20 select-all font-semibold inline-block mx-0.5 shadow-sm">
              {children}
            </code>
          );
        }
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function KaTeXRenderer({ content, block = false }: Props) {
  if (!content) return null;

  if (block) {
    return <SafeBlockMath math={content} />;
  }

  // Normalize delimiters returned by LLMs
  let normalized = content;
  normalized = normalized.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
  normalized = normalized.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // Split content into Math blocks, Math inline, and text segments
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return (
    <div className="react-markdown-container w-full break-words select-text leading-relaxed">
      {parts.map((part, i) => {
        if (!part) return null;

        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const innerMath = part.slice(2, -2);
          return <SafeBlockMath key={i} math={innerMath} />;
        }

        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const innerMath = part.slice(1, -1);
          return <SafeInlineMath key={i} math={innerMath} />;
        }

        return <FormattedSegment key={i} text={part} />;
      })}
    </div>
  );
}

