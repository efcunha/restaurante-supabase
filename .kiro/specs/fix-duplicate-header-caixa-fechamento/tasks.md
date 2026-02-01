# Implementation Plan: Fix Duplicate Header in Caixa Screens

## Overview

This implementation plan addresses the duplicate header bug by removing the custom inline headers from CaixaAberturaScreen, CaixaFechamentoScreen, and CaixaOperacoesScreen, and enhancing the Modal headers in AdminScreen to include the appropriate screen titles. The changes are minimal and focused on UI modifications without affecting business logic.

## Tasks

- [-] 1. Enhance Modal headers in AdminScreen to include screen titles
  - Modify the CaixaAbertura Modal header structure to include the "Abertura de Caixa" title
  - Modify the CaixaFechamento Modal header structure to include the "Fechamento de Caixa" title
  - Modify the CaixaOperacoes Modal header structure to include the "Sangria / Reforço" title
  - Add the `modalHeaderTitle` style to the AdminScreen StyleSheet
  - Update the `modalHeader` style to use flexDirection: 'row' and proper alignment
  - Ensure the titles are centered and the back buttons are properly positioned
  - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_

- [ ] 1.1 Write unit test for Modal headers rendering
  - Test that the CaixaAbertura Modal header contains the title text "Abertura de Caixa"
  - Test that the CaixaFechamento Modal header contains the title text "Fechamento de Caixa"
  - Test that the CaixaOperacoes Modal header contains the title text "Sangria / Reforço"
  - Test that the back button is present with text "← Voltar" on all three modals
  - Test that header styles match specifications (background color, padding, etc.)
  - _Requirements: 1.1, 1.2, 1.3, 2.5, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_

- [-] 2. Remove custom inline headers from all three caixa screens
  - Remove the header View element from CaixaAberturaScreen's return statement (lines 60-63)
  - Remove the header View element from CaixaFechamentoScreen's return statement (lines 192-199)
  - Remove the header View element from CaixaOperacoesScreen's return statement (line 30)
  - Remove the `header` style from all three StyleSheets
  - Remove the `headerTitle` style from all three StyleSheets
  - Ensure the container View and ScrollView remain intact in all three screens
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.5, 4.6, 4.7_

- [ ] 2.1 Write unit test for header removal
  - Test that CaixaAberturaScreen does not render a custom header element
  - Test that CaixaFechamentoScreen does not render a custom header element
  - Test that CaixaOperacoesScreen does not render a custom header element
  - Test that only one header is present when each screen is displayed in its Modal
  - Test that all content sections still render correctly on all three screens
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.5, 4.6, 4.7_

- [x] 3. Checkpoint - Verify visual appearance and basic functionality
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify that only one header is visible
  - Verify that the back button works correctly
  - Verify that all content renders properly

- [ ] 4. Write integration tests for complete user flow
  - Test opening the Abertura de Caixa screen from Admin
  - Test opening the Fechamento de Caixa screen from Admin
  - Test opening the Sangria / Reforço screen from Admin
  - Test that back button closes each Modal and returns to Admin
  - Test that opening a caixa works correctly (Abertura screen)
  - Test that selecting and closing a caixa works correctly (Fechamento screen)
  - Test that registering reforço and sangria works correctly (Operacoes screen)
  - Test that success alerts display correctly on all screens
  - Test that print functionality continues to work (Fechamento screen)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.8_

- [ ] 5. Write style consistency tests
  - Test that header background color matches #8B2F2F
  - Test that title text color is white (#FFFFFF)
  - Test that title font size is 20
  - Test that title font weight is bold
  - Test that header has proper padding and border radius
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Final checkpoint - Complete testing and verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no console errors or warnings
  - Verify functionality on both iOS and Android (if applicable)
  - Confirm all existing features work as expected on all three screens
  - Verify visual consistency across Abertura, Fechamento, and Operacoes screens

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The fix is purely UI-focused with no business logic changes
- All existing functionality must be preserved on all three screens
- All tests are required for comprehensive verification
