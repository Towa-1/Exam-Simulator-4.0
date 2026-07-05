import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Props {
  content: string;
  block?: boolean;
}

export function KaTeXRenderer({ content, block = false }: Props) {
  // Simple regex to find LaTeX between $...$ or $$...$$
  // This is a basic implementation; for complex markdown + math, a full parser is better.
  // But for this app, we'll assume the content is either math or text.
  
  const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
