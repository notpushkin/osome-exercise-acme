import { Body, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import { Ticket } from '../../db/models/Ticket';
import { User } from '../../db/models/User';

import {
  serializeTicketResponse,
  type TicketCreateRequest,
  type TicketResponse,
} from './tickets.schemas';
import { createTicket } from './tickets.service';

@Controller('api/v1/tickets')
export class TicketsController {
  @Get()
  async findAll() {
    // Normally we would serialize response here as well, but since this is
    // purely a diagnostic endpoint we’ll leave it as is for now.
    return await Ticket.findAll({ include: [Company, User] });
  }

  @Post()
  async create(
    @Body() { type, companyId }: TicketCreateRequest,
  ): Promise<TicketResponse> {
    // TODO: validate body type
    const ticket = await createTicket({ type, companyId });
    return serializeTicketResponse(ticket);
  }
}
