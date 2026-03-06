describe('Cloud Trial Connection Test', () => {
  it('successfully connects to the app', () => {
    cy.visit('/')
    cy.title({ timeout: 30000 }).should('include', 'Restaurante Web')
  })
})
