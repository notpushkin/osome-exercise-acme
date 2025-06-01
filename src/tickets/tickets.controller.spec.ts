import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../../db/models/Company';
import {
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { DbModule } from '../db.module';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      imports: [DbModule],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', async () => {
    expect(controller).toBeDefined();

    const res = await controller.findAll();
    console.log(res);
  });

  describe('create', () => {
    describe('managementReport', () => {
      it('creates managementReport ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('creates multiple managementReport tickets', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);

        const ticket2 = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket2.category).toBe(TicketCategory.accounting);
        expect(ticket2.assigneeId).toBe(user.id);
        expect(ticket2.status).toBe(TicketStatus.open);
      });

      it('if there are multiple accountants, assign the last one', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const user2 = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user2.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there is no accountant, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.managementReport,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role required to create a ticket (accountant)`,
          ),
        );
      });
    });

    describe('registrationAddressChange', () => {
      it('creates registrationAddressChange ticket if there’s a secretary', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('creates registrationAddressChange ticket if there’s a director', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test Director',
          role: UserRole.director,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if another open registrationAddressChange ticket exists, throw', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(`Another ticket of this type exists`),
        );
      });

      // TODO: test if we can create another ticket after the previous was
      // closed

      it('if there are multiple secretaries, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Multiple users with role corporateSecretary. Cannot create a ticket`,
          ),
        );
      });

      it('if there are multiple directors, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Multiple users with role director. Cannot create a ticket`,
          ),
        );
      });

      it('if there is a director and a secretary, assign secretary', async () => {
        const company = await Company.create({ name: 'test' });

        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });
        const corporateSecretary = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(corporateSecretary.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there is no secretary or director, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role required to create a ticket (corporateSecretary, director)`,
          ),
        );
      });
    });
  });

  describe('strikeOff', () => {
    it('creates strikeOff ticket if there’s a director', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test Director',
        role: UserRole.director,
        companyId: company.id,
      });

      const ticket = await controller.create({
        companyId: company.id,
        type: TicketType.strikeOff,
      });

      expect(ticket.category).toBe(TicketCategory.corporate);
      expect(ticket.assigneeId).toBe(user.id);
      expect(ticket.status).toBe(TicketStatus.open);
    });

    it('if another open strikeOff ticket exists, throw', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });

      await controller.create({
        companyId: company.id,
        type: TicketType.strikeOff,
      });

      await expect(
        controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        }),
      ).rejects.toEqual(
        new ConflictException(`Another ticket of this type exists`),
      );
    });

    it('if there are multiple directors, throw', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });
      await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });

      await expect(
        controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        }),
      ).rejects.toEqual(
        new ConflictException(
          `Multiple users with role director. Cannot create a ticket`,
        ),
      );
    });

    it('if there is a director and a secretary, assign director', async () => {
      const company = await Company.create({ name: 'test' });

      await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });
      const director = await User.create({
        name: 'Test User',
        role: UserRole.director,
        companyId: company.id,
      });
      await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });

      const ticket = await controller.create({
        companyId: company.id,
        type: TicketType.strikeOff,
      });

      expect(ticket.category).toBe(TicketCategory.corporate);
      expect(ticket.assigneeId).toBe(director.id);
      expect(ticket.status).toBe(TicketStatus.open);
    });

    it('if there is no director, throw', async () => {
      const company = await Company.create({ name: 'test' });

      await expect(
        controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        }),
      ).rejects.toEqual(
        new ConflictException(
          `Cannot find user with role required to create a ticket (director)`,
        ),
      );
    });
  });
});
