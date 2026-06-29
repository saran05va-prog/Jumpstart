import { useMemo, useRef, type MouseEvent } from "react";
import { renderMarkdown } from "../../lib/markdown";

interface Props {
  content: string;
  onWikilinkClick?: (noteTitle: string) => void;
  className?: string;
}

/**
 * Renders markdown content as HTML with Obsidian-style [[wikilink]] support.
 * Wikilinks are clickable — pass onWikilinkClick to handle navigation.
 */
export default function MarkdownPreview({ content, onWikilinkClick, className }: Props) {
  const html = useMemo(() => renderMarkdown(content || ""), [content]);
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("wikilink") && onWikilinkClick) {
      const title = target.getAttribute("data-note-title");
      if (title) onWikilinkClick(title);
    }
  }

  return (
    <div
      ref={ref}
      className={`md-preview ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  );
}
