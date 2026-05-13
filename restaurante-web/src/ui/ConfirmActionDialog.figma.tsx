import figma from '@figma/code-connect';
import { ConfirmActionDialog } from './ConfirmActionDialog';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=6:4', {
  example: () => (
    <ConfirmActionDialog
      visible
      title="Confirmar acao"
      message="Esta operacao nao pode ser desfeita."
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  ),
});
