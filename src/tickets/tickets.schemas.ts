import { Ticket, TicketType } from '../../db/models/Ticket';

export interface TicketCreateRequest {
  type: TicketType;
  companyId: number;
}

export type TicketResponse = Pick<
  Ticket,
  'id' | 'type' | 'companyId' | 'assigneeId' | 'status' | 'category'
>;

export function serializeTicketResponse(ticket: Ticket): TicketResponse {
  return {
    id: ticket.id,
    type: ticket.type,
    assigneeId: ticket.assigneeId,
    status: ticket.status,
    category: ticket.category,
    companyId: ticket.companyId,
  };
}
