'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      BEGIN;
      DROP INDEX IF EXISTS uniqueTicketsPerCompany;
      CREATE UNIQUE INDEX uniqueTicketsPerCompany ON "tickets" ("companyId")
        WHERE (type IN ('registrationAddressChange', 'strikeOff')) AND status = 'open';
      COMMIT;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      BEGIN;
      DROP INDEX IF EXISTS uniqueTicketsPerCompany;
      CREATE UNIQUE INDEX uniqueTicketsPerCompany ON "tickets" ("companyId")
        WHERE (type = 'registrationAddressChange') AND status = 'open';
      COMMIT;
    `);
  },
};
