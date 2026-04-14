import figma from '@figma/code-connect';
import { FormSection } from './index';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=6:5', {
  example: () => <FormSection title="Dados" description="Campos obrigatorios" children={null} />,
});
