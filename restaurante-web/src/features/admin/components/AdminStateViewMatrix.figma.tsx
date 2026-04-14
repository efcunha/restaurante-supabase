/**
 * Figma Code Connect — AdminStateViewMatrix (restaurante-web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import React from 'react';
import { View } from 'react-native';
import { StateView } from '../../../ui/StateView';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=9:3', {
  example: () => (
    <View style={{ gap: 12 }}>
      <StateView state="loading" message="Carregando metricas..." />
      <StateView state="error" message="Falha ao carregar dados." onRetry={() => undefined} />
    </View>
  ),
});
