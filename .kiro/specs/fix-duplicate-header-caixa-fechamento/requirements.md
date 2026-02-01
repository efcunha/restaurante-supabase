# Requirements Document

## Introduction

This specification addresses a UI bug in three cash register screens (CaixaAberturaScreen, CaixaFechamentoScreen, and CaixaOperacoesScreen) where duplicate headers are displayed at the top of the page. All three screens currently show a "← Voltar" (Back) button from the parent Modal wrapper and a custom inline header displaying the screen title, creating visual duplication and poor user experience.

## Glossary

- **CaixaAberturaScreen**: The screen component responsible for displaying the cash register opening interface
- **CaixaFechamentoScreen**: The screen component responsible for displaying the cash register closing interface
- **CaixaOperacoesScreen**: The screen component responsible for displaying sangria (withdrawal) and reforço (reinforcement) operations
- **AdminScreen**: The parent screen that renders all three caixa screens inside Modals
- **Modal_Header**: The header section of the Modal component in AdminScreen that contains the back button
- **Inline_Header_Abertura**: The custom header element defined within CaixaAberturaScreen (lines 60-63)
- **Inline_Header_Fechamento**: The custom header element defined within CaixaFechamentoScreen (lines 192-199)
- **Inline_Header_Operacoes**: The custom header element defined within CaixaOperacoesScreen (line 30)
- **ScreenHeader**: A reusable header component available in the codebase for consistent header styling

## Requirements

### Requirement 1: Remove Duplicate Header

**User Story:** As a user, I want to see only one header at the top of all cash register screens (Abertura, Fechamento, and Sangria/Reforço), so that the interface is clean and not confusing.

#### Acceptance Criteria

1. WHEN the Abertura de Caixa screen is displayed, THE System SHALL render exactly one header element at the top
2. WHEN the Fechamento de Caixa screen is displayed, THE System SHALL render exactly one header element at the top
3. WHEN the Sangria / Reforço screen is displayed, THE System SHALL render exactly one header element at the top
4. THE System SHALL NOT display both the Modal header and the inline header simultaneously on any of the three screens
5. WHEN any screen is rendered, THE System SHALL maintain all existing visual styling consistency with other screens in the application

### Requirement 2: Preserve Back Navigation

**User Story:** As a user, I want to navigate back from all cash register screens, so that I can return to the previous screen.

#### Acceptance Criteria

1. WHEN the user clicks the back button on Abertura de Caixa, THE System SHALL close the screen
2. WHEN the user clicks the back button on Fechamento de Caixa, THE System SHALL close the screen
3. WHEN the user clicks the back button on Sangria / Reforço, THE System SHALL close the screen
4. WHEN the back button is clicked on any screen, THE System SHALL return the user to the Admin screen
5. THE System SHALL display a clearly visible back button with the text "← Voltar" on all three screens

### Requirement 3: Display Screen Title

**User Story:** As a user, I want to see the appropriate screen title on each screen, so that I know which screen I am on.

#### Acceptance Criteria

1. THE System SHALL display "Abertura de Caixa" as the screen title on the Abertura de Caixa screen
2. THE System SHALL display "Fechamento de Caixa" as the screen title on the Fechamento de Caixa screen
3. THE System SHALL display "Sangria / Reforço" as the screen title on the Sangria / Reforço screen
4. WHEN any screen is rendered, THE System SHALL position the title in the header area
5. THE System SHALL style the title consistently with other screen titles in the application

### Requirement 4: Maintain Existing Functionality

**User Story:** As a user, I want all existing features to continue working after the header fix, so that I can complete my cash register tasks without issues.

#### Acceptance Criteria

1. WHEN the header is fixed on Abertura de Caixa, THE System SHALL preserve all existing cash register opening functionality
2. WHEN the header is fixed on Fechamento de Caixa, THE System SHALL preserve all existing cash register closing functionality
3. WHEN the header is fixed on Sangria / Reforço, THE System SHALL preserve all existing sangria and reforço registration functionality
4. WHEN users interact with any screen, THE System SHALL maintain all existing data loading and display behaviors
5. WHEN Abertura de Caixa renders, THE System SHALL display the valor inicial input and open button without modification
6. WHEN Fechamento de Caixa renders, THE System SHALL display all existing content sections (caixas list, resumo financeiro, etc.) without modification
7. WHEN Sangria / Reforço renders, THE System SHALL display both reforço and sangria input sections without modification
8. THE System SHALL maintain all existing modal behaviors (success alerts, print functionality)

### Requirement 5: Consistent Visual Styling

**User Story:** As a user, I want the Fechamento de Caixa screen to look consistent with other screens in the app, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE System SHALL use the same header background color (#8B2F2F) as other screens
2. THE System SHALL use the same header text styling (color, font size, font weight) as other screens
3. THE System SHALL maintain the same header padding and spacing as other screens
4. THE System SHALL use the same border radius styling for the header as other screens
