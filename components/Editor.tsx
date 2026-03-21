
import React, { forwardRef, useCallback, useEffect, useRef } from 'react';

declare var katex: any;

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onMouseUp: () => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  spellCheck: boolean;
  onSlashCommand?: (x: number, y: number) => void;
  t: (key: string) => string;
}

const Editor = forwardRef<HTMLDivElement, EditorProps>(({ content, onChange, onMouseUp, onDoubleClick, onClick, spellCheck, onSlashCommand, t }, ref) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const contentRef = ref || internalRef;
  const resizingRef = useRef<{
      isResizing: boolean;
      table: HTMLTableElement | null;
      column: HTMLTableCellElement | null;
      startX: number;
      startWidth: number;
  }>({ isResizing: false, table: null, column: null, startX: 0, startWidth: 0 });

  const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    onChange(event.currentTarget.innerHTML);
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    // Check if the user is pasting plain text explicitly (Ctrl+Shift+V usually triggers plain text anyway, 
    // but we can intercept standard paste if we want to clean it up).
    // For now, we'll let the browser handle standard paste, but we'll add a custom command for plain text paste.
    // Wait, the user wants to be able to paste without formatting.
    // If they use the context menu, we can trigger a custom event or command.
  }, []);

  const handleClickToFocus = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // If they clicked directly on the editor container (not on text inside it), focus at the end
    if (e.target === contentRef.current || e.target === internalRef.current) {
      const editor = contentRef && 'current' in contentRef ? contentRef.current : null;
      if (editor) {
        editor.focus();
        // Move cursor to the end
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false); // collapse to end
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
    onClick(e);
  }, [onClick, contentRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === '/') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (onSlashCommand) {
          onSlashCommand(rect.right, rect.bottom);
        }
      }
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement;
        const cell = element?.closest('td, th') as HTMLTableCellElement;
        
        if (cell) {
          const row = cell.parentElement as HTMLTableRowElement;
          const table = row.closest('table') as HTMLTableElement;
          if (table) {
            const rowIndex = row.rowIndex;
            const cellIndex = cell.cellIndex;
            
            if (e.key === 'ArrowUp' && rowIndex > 0) {
              const targetCell = table.rows[rowIndex - 1].cells[cellIndex];
              if (targetCell) {
                e.preventDefault();
                const newRange = document.createRange();
                newRange.selectNodeContents(targetCell);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                targetCell.focus();
              }
            } else if (e.key === 'ArrowDown' && rowIndex < table.rows.length - 1) {
              const targetCell = table.rows[rowIndex + 1].cells[cellIndex];
              if (targetCell) {
                e.preventDefault();
                const newRange = document.createRange();
                newRange.selectNodeContents(targetCell);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                targetCell.focus();
              }
            }
          }
        }
      }
    }

    if (e.key === ' ' || e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const offset = range.startOffset;
        
        // Auto-markdown for H1: "# "
        if (text.startsWith('# ') && offset === 2) {
          e.preventDefault();
          node.textContent = text.substring(2);
          document.execCommand('formatBlock', false, 'H1');
          
          // Move cursor to the end of the new H1
          const newRange = document.createRange();
          newRange.selectNodeContents(node.parentNode as Node);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
          return;
        }
        // Auto-markdown for H2: "## "
        if (text.startsWith('## ') && offset === 3) {
          e.preventDefault();
          node.textContent = text.substring(3);
          document.execCommand('formatBlock', false, 'H2');
          
          const newRange = document.createRange();
          newRange.selectNodeContents(node.parentNode as Node);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
          return;
        }
        // Auto-markdown for Bullet List: "- " or "* "
        if ((text.startsWith('- ') || text.startsWith('* ')) && offset === 2) {
          e.preventDefault();
          node.textContent = text.substring(2);
          document.execCommand('insertUnorderedList', false);
          return;
        }
      }
    }
  }, []);

  // Math Rendering Logic
  const renderMath = () => {
      const editor = contentRef && 'current' in contentRef ? contentRef.current : null;
      if (!editor || typeof katex === 'undefined') return;

      const mathNodes = editor.querySelectorAll('.math-node');
      mathNodes.forEach(node => {
          const latex = (node as HTMLElement).dataset.latex;
          if (latex && !node.getAttribute('data-rendered')) {
              try {
                  katex.render(latex, node, { throwOnError: false });
                  node.setAttribute('data-rendered', 'true');
                  // Make it non-editable content-wise so backspace deletes the whole unit
                  node.setAttribute('contenteditable', 'false'); 
              } catch (e) {
                  console.error(e);
              }
          }
      });
  };

  useEffect(() => {
    renderMath();
  }, [content]);

  useEffect(() => {
    const editor = contentRef && 'current' in contentRef ? contentRef.current : null;
    if (editor && editor.innerHTML !== content) {
      // This helps in preserving the cursor position on external updates (like loading a doc).
      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
      
      editor.innerHTML = content;
      renderMath();
      
      if(range && selection) {
        try {
            // Check if the container is still in the DOM before restoring
            if (document.body.contains(range.startContainer)) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch(e){
            console.error("Failed to restore cursor position.", e);
        }
      }
    }
  }, [content, contentRef]);

  // Table Resizing Logic
  useEffect(() => {
      const editor = contentRef && 'current' in contentRef ? (contentRef as React.RefObject<HTMLDivElement>).current : null;
      if (!editor) return;

      const handleMouseMove = (e: MouseEvent) => {
          // If resizing, process the drag
          if (resizingRef.current.isResizing && resizingRef.current.column) {
              const diffX = e.clientX - resizingRef.current.startX;
              const newWidth = Math.max(20, resizingRef.current.startWidth + diffX);
              resizingRef.current.column.style.width = `${newWidth}px`;
              e.preventDefault(); // Prevent text selection
              return;
          }

          // Detect hover over cell borders
          const target = e.target as HTMLElement;
          const cell = target.closest('td, th') as HTMLTableCellElement;
          if (!cell || !editor.contains(cell)) {
              editor.style.cursor = 'auto';
              return;
          }

          const rect = cell.getBoundingClientRect();
          const edgeThreshold = 5; // pixels
          const isRightEdge = e.clientX > rect.right - edgeThreshold;
          
          if (isRightEdge) {
              editor.style.cursor = 'col-resize';
          } else {
              editor.style.cursor = 'auto';
          }
      };

      const handleMouseDown = (e: MouseEvent) => {
          if (editor.style.cursor === 'col-resize') {
              const target = e.target as HTMLElement;
              const cell = target.closest('td, th') as HTMLTableCellElement;
              if (cell) {
                  resizingRef.current = {
                      isResizing: true,
                      table: cell.closest('table'),
                      column: cell,
                      startX: e.clientX,
                      startWidth: cell.offsetWidth,
                  };
                  e.preventDefault();
                  e.stopPropagation();
              }
          }
      };

      const handleMouseUpGlobal = () => {
          if (resizingRef.current.isResizing) {
              resizingRef.current.isResizing = false;
              resizingRef.current.table = null;
              resizingRef.current.column = null;
              editor.style.cursor = 'auto';
              // Trigger change to save state
              onChange(editor.innerHTML);
          }
      };

      editor.addEventListener('mousemove', handleMouseMove);
      editor.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUpGlobal);

      return () => {
          editor.removeEventListener('mousemove', handleMouseMove);
          editor.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('mouseup', handleMouseUpGlobal);
      };
  }, [onChange, contentRef]);
  
  const handleFormulaMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement;
    
    if (cell) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchorNode = selection.anchorNode;
        let currentFocusedCell: HTMLTableCellElement | null = null;
        let node: Node | null = anchorNode;
        
        const editor = contentRef && 'current' in contentRef ? contentRef.current : null;
        while (node && node !== editor) {
          if (node.nodeName === 'TD' || node.nodeName === 'TH') {
            currentFocusedCell = node as HTMLTableCellElement;
            break;
          }
          node = node.parentNode;
        }

        if (currentFocusedCell && currentFocusedCell !== cell) {
          const text = currentFocusedCell.innerText.trim();
          if (text.startsWith('=')) {
            // We are editing a formula in another cell!
            e.preventDefault(); // Prevent focus change
            e.stopPropagation();
            
            const row = cell.parentElement as HTMLTableRowElement;
            const rowIndex = row.rowIndex + 1;
            const colIndex = cell.cellIndex;
            const colLetter = String.fromCharCode(65 + colIndex);
            
            const rect = cell.getBoundingClientRect();
            const isColumnHeader = e.clientY < rect.top && e.clientY > rect.top - 30;
            const isRowHeader = e.clientX < rect.left && e.clientX > rect.left - 45;

            let cellAddress = `${colLetter}${rowIndex}`;
            
            if (isColumnHeader) {
                const table = row.closest('table');
                if (table) {
                    const lastRow = table.rows.length;
                    cellAddress = `${colLetter}1:${colLetter}${lastRow}`;
                }
            } else if (isRowHeader) {
                const lastColLetter = String.fromCharCode(65 + row.cells.length - 1);
                cellAddress = `A${rowIndex}:${lastColLetter}${rowIndex}`;
            }
            
            // Insert the address at the current cursor position
            document.execCommand('insertText', false, cellAddress);
            return;
          }
        }
      }
    }
  }, [contentRef]);

  const isEmpty = !content || content === '<p><br></p>' || content === '<p></p>' || content === '<br>' || content.trim() === '' || content === '<div><br></div>';

  return (
    <div
      ref={contentRef}
      onMouseDown={handleFormulaMouseDown}
      onInput={handleInput}
      onMouseUp={onMouseUp}
      onDoubleClick={onDoubleClick}
      onClick={handleClickToFocus}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      contentEditable={true}
      spellCheck={spellCheck}
      suppressContentEditableWarning={true}
      data-placeholder={t('editor.placeholder')}
      data-is-empty={isEmpty ? 'true' : 'false'}
      className="relative min-h-full focus:outline-none prose dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400 data-[is-empty=true]:before:content-[attr(data-placeholder)] data-[is-empty=true]:before:text-gray-400 data-[is-empty=true]:before:pointer-events-none data-[is-empty=true]:before:absolute data-[is-empty=true]:before:bg-transparent"
      // The initial content is set via useEffect to avoid hydration issues.
    />
  );
});

Editor.displayName = 'Editor';

export default Editor;
