import React, { useLayoutEffect, useRef } from 'react';

type ResizableTableContainerProps = {
  children: React.ReactNode;
  className?: string;
  storageKey?: string;
};

const MIN_COLUMN_WIDTH = 96;

const ResizableTableContainer: React.FC<ResizableTableContainerProps> = ({
  children,
  className = '',
  storageKey,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const table = container?.querySelector('table');
    const headerRow = table?.querySelector('thead tr');
    if (!container || !table || !headerRow) return;

    table.classList.add('table--resizable');

    const headers = Array.from(headerRow.querySelectorAll('th')) as HTMLTableCellElement[];
    if (headers.length === 0) return;

    let colgroup = table.querySelector('colgroup[data-resizable="true"]') as HTMLTableColElement | null;
    if (!colgroup) {
      colgroup = document.createElement('colgroup') as unknown as HTMLTableColElement;
      colgroup.setAttribute('data-resizable', 'true');
      table.insertBefore(colgroup, table.firstChild);
    }

    while (colgroup.children.length < headers.length) {
      colgroup.appendChild(document.createElement('col'));
    }
    while (colgroup.children.length > headers.length) {
      colgroup.removeChild(colgroup.lastChild as ChildNode);
    }

    const cols = Array.from(colgroup.children) as HTMLTableColElement[];
    const savedWidths = storageKey
      ? (() => {
          try {
            const raw = window.localStorage.getItem(`table-widths:${storageKey}`);
            const parsed = raw ? JSON.parse(raw) : null;
            return Array.isArray(parsed) ? parsed : null;
          } catch {
            return null;
          }
        })()
      : null;

    headers.forEach((header, index) => {
      header.classList.add('table-resizable__th');
      const width =
        typeof savedWidths?.[index] === 'number' && savedWidths[index] >= MIN_COLUMN_WIDTH
          ? savedWidths[index]
          : Math.max(MIN_COLUMN_WIDTH, Math.ceil(header.getBoundingClientRect().width));
      cols[index].style.width = `${width}px`;
      header.style.width = `${width}px`;

      let handle = header.querySelector('.table-resizable__handle') as HTMLSpanElement | null;
      if (!handle) {
        handle = document.createElement('span');
        handle.className = 'table-resizable__handle';
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'vertical');
        header.appendChild(handle);
      }
    });

    const persistWidths = () => {
      if (!storageKey) return;
      try {
        const widths = cols.map((col) => {
          const raw = Number.parseFloat(col.style.width);
          return Number.isFinite(raw) ? raw : MIN_COLUMN_WIDTH;
        });
        window.localStorage.setItem(`table-widths:${storageKey}`, JSON.stringify(widths));
      } catch {
        /* ignore storage errors */
      }
    };

    let activeIndex = -1;
    let startX = 0;
    let startWidth = 0;

    const onPointerMove = (event: PointerEvent) => {
      if (activeIndex < 0) return;
      const col = cols[activeIndex];
      const nextWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + event.clientX - startX);
      col.style.width = `${nextWidth}px`;
      headers[activeIndex].style.width = `${nextWidth}px`;
    };

    const stopResize = () => {
      if (activeIndex < 0) return;
      activeIndex = -1;
      document.body.classList.remove('table-resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
      persistWidths();
    };

    const cleanupListeners: Array<() => void> = [];

    headers.forEach((header, index) => {
      const handle = header.querySelector('.table-resizable__handle') as HTMLSpanElement | null;
      if (!handle) return;

      const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        activeIndex = index;
        startX = event.clientX;
        startWidth = cols[index].getBoundingClientRect().width || header.getBoundingClientRect().width;
        document.body.classList.add('table-resizing');
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', stopResize);
      };

      handle.addEventListener('pointerdown', onPointerDown);
      cleanupListeners.push(() => handle.removeEventListener('pointerdown', onPointerDown));
    });

    return () => {
      stopResize();
      cleanupListeners.forEach((fn) => fn());
    };
  }, [children, storageKey]);

  return (
    <div ref={containerRef} className={`table-container ${className}`.trim()}>
      {children}
    </div>
  );
};

export default ResizableTableContainer;
