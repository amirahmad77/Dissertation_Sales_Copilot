import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLeadStore, LeadStatus } from '@/store/useLeadStore';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

const COLUMNS: { id: LeadStatus; title: string; description: string }[] = [
  {
    id: 'New Leads',
    title: 'New Leads',
    description: 'Fresh opportunities to pursue'
  },
  {
    id: 'Contacted',
    title: 'Contacted',
    description: 'Initial outreach completed'
  },
  {
    id: 'Proposal Sent',
    title: 'Proposal Sent',
    description: 'Awaiting client response'
  },
  {
    id: 'Awaiting Signature',
    title: 'Awaiting Signature',
    description: 'Contract sent for e-signature'
  },
  {
    id: 'Closed-Won',
    title: 'Closed-Won',
    description: 'Successfully closed deals'
  }
];

/**
 * SortableLeadCard wraps an individual lead card with DnD behaviour so items can be reordered
 * within and across kanban columns while preserving click interactions.
 */
function SortableLeadCard({ lead, onClick }: { lead: any; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "relative transition-transform duration-200",
        isDragging && "rotate-2 scale-105 shadow-lg opacity-50"
      )}
    >
      {/* Lead Card */}
      <LeadCard
        lead={lead}
        onClick={onClick}
        isDragDisabled={isDragging}
      />
      {/* Drag Handle */}
      <div 
        {...listeners}
        className="absolute top-3 right-3 p-1 opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        title="Drag to move between columns"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

/**
 * DroppableColumn provides a styled drop target that highlights when a card is hovering over it.
 *
 * @param column - Column metadata used for styling and DnD identifiers.
 * @param children - Rendered lead cards for the column.
 */
function DroppableColumn({ column, children }: { column: any; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  const getColumnStyle = (columnId: string) => {
    switch (columnId) {
      case 'New Leads':
        return 'bg-blue-50 border-blue-200';
      case 'Contacted':
        return 'bg-yellow-50 border-yellow-200';
      case 'Proposal Sent':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[400px] p-4 rounded-lg border-2 border-dashed transition-colors duration-200",
        isOver ? "border-primary bg-primary/5" : getColumnStyle(column.id)
      )}
    >
      {children}
    </div>
  );
}

/**
 * KanbanBoard displays lead statuses grouped by pipeline stage with drag-and-drop support for
 * updating deal progress inline.
 */
export function KanbanBoard() {
  const { leads, updateLeadStatus, setSelectedLeadId } = useLeadStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Returns all leads that match the provided pipeline status.
   *
   * @param status - Column identifier to filter by.
   */
  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  /**
   * Handles drag completion events and updates the lead status when a card is dropped on a new column.
   *
   * @param event - Drag event details from dnd-kit.
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the lead being dragged
    const draggedLead = leads.find(lead => lead.id === activeId);
    if (!draggedLead) return;

    // Check if we're dropping on a column
    const targetColumn = COLUMNS.find(col => col.id === overId);
    if (targetColumn && draggedLead.status !== targetColumn.id) {
      // Update the lead's status to the new column
      updateLeadStatus(activeId, targetColumn.id);
    }
  };

  /**
   * Opens the lead detail drawer for the selected lead card.
   *
   * @param leadId - Identifier for the lead being inspected.
   */
  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Actionable Pipeline</h2>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {COLUMNS.map((column) => {
            const columnLeads = getLeadsByStatus(column.id);
            
            return (
              <div key={column.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{column.title}</h3>
                    <p className="text-sm text-muted-foreground">{column.description}</p>
                  </div>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm font-medium">
                    {columnLeads.length}
                  </span>
                </div>

                <DroppableColumn column={column}>
                  <SortableContext
                    items={columnLeads.map(lead => lead.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {columnLeads.map((lead) => (
                        <SortableLeadCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => handleLeadClick(lead.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}