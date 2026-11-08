import type { OrderWithProduct } from "@/types/order";
import { DetailSection, SectionAction } from "./DetailSection";

export function NoteSection({ order, onEdit, className }: { order: OrderWithProduct; onEdit: () => void; className?: string }) {
  const note = order.napomena?.trim();
  return (
    <DetailSection
      id="napomena"
      title="Napomena"
      className={className}
      action={<SectionAction label={note ? "Izmeni" : "Dodaj"} ariaLabel={note ? "Izmeni napomenu" : "Dodaj napomenu"} onClick={onEdit} />}
    >
      {note ? (
        <p className="text-[15px] leading-[22px] whitespace-pre-wrap break-words text-text md:text-sm md:leading-5">{note}</p>
      ) : (
        <p className="text-sm text-text-muted">Bez napomene.</p>
      )}
    </DetailSection>
  );
}
