/**
 * Figma Code Connect — Card (restaurante-site / React DOM)
 *
 * Maps Figma Card → DOM <div /> with card styling.
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import React from 'react';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:21', {
  example: () => (
    <div className="card card--low">
      {/* Children defined in Figma */}
    </div>
  ),
});
