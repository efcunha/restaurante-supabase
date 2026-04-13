/**
 * Figma Code Connect — Button (restaurante-site / React)
 *
 * Maps Figma Button → DOM <button /> element.
 *
 * Figma component properties required:
 *   "Label"   (text)       → children
 *   "Variant" (variant)    → Primary | Secondary | Ghost | Danger
 *   "Size"    (variant)    → Small | Medium | Large
 *   "State"   (variant)    → Default | Disabled | Loading
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import React from 'react';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:12', {
  example: () => (
    <button
      className="btn btn--primary btn--md"
      disabled={false}
    >
      Confirmar
    </button>
  ),
});
