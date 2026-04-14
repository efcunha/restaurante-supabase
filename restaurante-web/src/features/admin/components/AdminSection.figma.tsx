/**
 * Figma Code Connect — AdminSection (restaurante-web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import React from 'react';
import { AdminSection } from './AdminSection';
import { AdminActionCard } from './AdminActionCard';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=9:2', {
  example: () => (
    <AdminSection title="FINANCEIRO" showDivider>
      <AdminActionCard
        name="Relatorio de Cancelamentos"
        icon="🧾"
        subtitle="Eventos auditaveis"
        onPress={() => undefined}
      />
    </AdminSection>
  ),
});
