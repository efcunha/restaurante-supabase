/**
 * Figma Code Connect — AdminActionCard (restaurante-web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { AdminActionCard } from './AdminActionCard';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=9:1', {
  example: () => (
    <AdminActionCard
      name="Assinatura SaaS"
      icon="💳"
      subtitle="Gestao de cobranca"
      onPress={() => undefined}
      danger={false}
      disabled={false}
    />
  ),
});
