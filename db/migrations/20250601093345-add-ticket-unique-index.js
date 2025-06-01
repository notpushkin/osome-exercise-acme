'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uniqueTicketsPerCompany ON "tickets" ("companyId")
      WHERE type = 'registrationAddressChange' AND status = 'open';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX uniqueTicketsPerCompany;
    `);
  },
};
