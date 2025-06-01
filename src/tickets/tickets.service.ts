import { ConflictException } from '@nestjs/common';
import { UniqueConstraintError } from 'sequelize';

import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';

export interface TicketParams {
  type: TicketType;
  companyId: number;
}

export async function createTicket({
  type,
  companyId,
}: TicketParams): Promise<Ticket> {
  const category = ticketCategoryByType[type];
  const userRole = assigneeRoleByTicketType[type];
  const assignee = await findAssigneeByRole(companyId, userRole);

  try {
    return await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      // We’ve tripped the uniqueTicketsPerCompany index. (Would be a good idea
      // to check if it’s some other constraint, e.g. by checking
      // `error.original.constraint`, but for now we only have this one.)
      throw new ConflictException('Another ticket of this type exists');
    }

    throw error;
  }
}

const ticketCategoryByType: { [K in TicketType]: TicketCategory } = {
  [TicketType.managementReport]: TicketCategory.accounting,
  [TicketType.registrationAddressChange]: TicketCategory.corporate,
};

const assigneeRoleByTicketType: { [K in TicketType]: UserRole } = {
  [TicketType.managementReport]: UserRole.accountant,
  [TicketType.registrationAddressChange]: UserRole.corporateSecretary,
};

async function findAssigneeByRole(companyId: number, role: UserRole) {
  const assignees = await User.findAll({
    where: { companyId, role },
    order: [['createdAt', 'DESC']],
  });

  if (!assignees.length)
    throw new ConflictException(
      `Cannot find user with role ${role} to create a ticket`,
    );

  if (role === UserRole.corporateSecretary && assignees.length > 1)
    throw new ConflictException(
      `Multiple users with role ${role}. Cannot create a ticket`,
    );

  return assignees[0];
}
