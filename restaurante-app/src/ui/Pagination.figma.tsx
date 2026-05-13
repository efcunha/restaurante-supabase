/**
 * Figma Code Connect — Pagination (restaurante-app / React Native)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Pagination } from '../components/ui-next/Pagination';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:8', {
  example: () => (
    <Pagination page={1} totalPages={5} onPageChange={() => {}} />
  ),
});
