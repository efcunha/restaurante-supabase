/**
 * Figma Code Connect — Tabs (restaurante-web / React Native Web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Tabs } from '../components/ui-next/Tabs';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:10', {
  example: () => (
    <Tabs
      items={[{ key: 'todos', label: 'Todos' }]}
      activeKey="todos"
      onChange={() => {}}
    />
  ),
});
