import { ConflictException } from '@nestjs/common';
import { fn, col, cast, Op, UniqueConstraintError } from 'sequelize';

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
  const userRoles = assigneeRolesByTicketType[type];
  const assignee = await findAssigneeByRoles(companyId, userRoles);

  let ticket: Ticket;
  try {
    ticket = await Ticket.create({
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

  if (type === TicketType.strikeOff) {
    // TODO: Schedule a job instead?
    await Ticket.update({
      status: TicketStatus.resolved,
    }, {
      where: {
        companyId,
        id: { [Op.ne]: ticket.id },
      }
    });
  }

  return ticket;
}

const ticketCategoryByType: { [K in TicketType]: TicketCategory } = {
  [TicketType.managementReport]: TicketCategory.accounting,
  [TicketType.registrationAddressChange]: TicketCategory.corporate,
  [TicketType.strikeOff]: TicketCategory.corporate,
};

const assigneeRolesByTicketType: { [K in TicketType]: UserRole[] } = {
  [TicketType.managementReport]: [UserRole.accountant],
  [TicketType.registrationAddressChange]: [
    UserRole.corporateSecretary,
    UserRole.director,
  ],
  [TicketType.strikeOff]: [UserRole.director],
};

const uniqueRoleRequired = [UserRole.corporateSecretary, UserRole.director];

async function findAssigneeByRoles(companyId: number, roles: UserRole[]) {
  const { count, rows } = await User.findAndCountAll({
    where: {
      companyId,
      role: { [Op.in]: roles },
    },
    order: [
      fn('array_position', cast(roles, 'varchar[]'), col('role')),
      ['createdAt', 'DESC'],
    ],
    limit: 2,
  });

  if (!count)
    throw new ConflictException(
      `Cannot find user with role required to create a ticket (${roles.join(', ')})`,
    );

  const multipleUsersWithSameRole = count > 1 && rows[0].role === rows[1].role;
  if (multipleUsersWithSameRole && uniqueRoleRequired.includes(rows[0].role))
    throw new ConflictException(
      `Multiple users with role ${rows[0].role}. Cannot create a ticket`,
    );

  return rows[0];
}
