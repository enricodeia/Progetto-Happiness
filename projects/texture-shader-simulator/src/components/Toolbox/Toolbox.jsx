import { useState } from 'react';
import './Toolbox.css';

// Floating top-center "material library" toolbox. Appears only when at least
// one asset has been saved. Each chip is draggable — drop it on a mesh to
// assign that material to that mesh.
const Toolbox = ({ assets, glbLoaded, hasAssignments, onExportGlb, onClearAssignments }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!assets || assets.length === 0) return null;

  return (
    <div className={`toolbox${collapsed ? ' toolbox--collapsed' : ''}`} role="toolbar">
      <header className="toolbox__header">
        <button
          type="button"
          className="toolbox__toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand library' : 'Collapse'}
        >
          {collapsed ? '▾' : '▴'}
        </button>
        <span className="toolbox__title">Material library</span>
        <span className="toolbox__badge">{assets.length}</span>
        <span className="toolbox__hint">
          {glbLoaded
            ? 'Drag a chip onto a mesh in the GLB scene'
            : 'Load a .glb to assign materials per mesh'}
        </span>
        <div className="toolbox__actions">
          {hasAssignments && (
            <button
              type="button"
              className="toolbox__btn toolbox__btn--ghost"
              onClick={onClearAssignments}
              title="Reset all per-mesh assignments"
            >
              Clear
            </button>
          )}
          {glbLoaded && (
            <button
              type="button"
              className="toolbox__btn toolbox__btn--primary"
              onClick={onExportGlb}
              title="Download the GLB with materials baked in"
            >
              ⬇ Export GLB
            </button>
          )}
        </div>
      </header>

      {!collapsed && (
        <div className="toolbox__items">
          {assets.map((a) => (
            <div
              key={a.id}
              className="tool-chip"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-tss-asset', a.id);
                e.dataTransfer.setData('text/plain', a.name);
                e.dataTransfer.effectAllowed = 'copy';
                // Use the chip's image as the drag preview if possible.
                if (a.thumb) {
                  const img = new Image();
                  img.src = a.thumb;
                  e.dataTransfer.setDragImage(img, 28, 28);
                }
                document.body.classList.add('is-dragging-asset');
              }}
              onDragEnd={() => {
                document.body.classList.remove('is-dragging-asset');
              }}
              title={`${a.name} — drag onto a mesh`}
            >
              {a.thumb ? (
                <img className="tool-chip__thumb" src={a.thumb} alt={a.name} />
              ) : (
                <span className="tool-chip__thumb tool-chip__thumb--empty" />
              )}
              <span className="tool-chip__name">{a.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Toolbox;
