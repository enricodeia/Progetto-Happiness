import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable drag-and-drop panel — the user reorders pill items by dragging; the parent receives
// `onChange(nextOrderIds)` and persists the new order in its own state.
function SortableRow({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    background: isDragging ? '#292c34' : '#1f2128',
    border: '1px solid #2d313b',
    color: '#e7e9ef',
    borderRadius: 4,
    padding: '6px 8px',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 11,
    letterSpacing: '0.02em',
    cursor: 'grab',
    userSelect: 'none',
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span style={{ opacity: 0.45, fontFamily: 'ui-monospace, monospace' }}>⋮⋮</span>
      <span>{label}</span>
    </div>
  )
}

export default function PillOrderPanel({
  visible,
  items,          // [{ id, name }]
  order,          // array of ids in current order
  onChange,       // (nextOrderIds) => void
  topPx = 8,
  rightPx = 8,
  widthPx = 230,
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(active.id)
    const newIndex = order.indexOf(over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(order, oldIndex, newIndex))
  }

  if (!visible) return null

  const byId = new Map(items.map((c) => [c.id, c]))

  return (
    <div
      style={{
        position: 'fixed',
        top: `${topPx}px`,
        right: `${rightPx}px`,
        width: `${widthPx}px`,
        maxHeight: '80vh',
        overflowY: 'auto',
        background: '#181a20',
        border: '1px solid #2d313b',
        borderRadius: 6,
        padding: 10,
        zIndex: 99997,
        boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{
        color: '#a2a5ae',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontFamily: "'Basis Grotesque Pro', -apple-system, BlinkMacSystemFont, sans-serif",
        marginBottom: 8,
      }}>
        Pill order (drag to reorder)
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id) => {
            const client = byId.get(id)
            if (!client) return null
            return <SortableRow key={id} id={id} label={client.name} />
          })}
        </SortableContext>
      </DndContext>
    </div>
  )
}
