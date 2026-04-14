import { useState } from 'react';
import { Button, ConfirmActionDialog } from './index';

const Demo = ({ danger = false }: { danger?: boolean }) => {
  const [visible, setVisible] = useState(true);

  return (
    <>
      <Button label="Abrir dialog" onPress={() => setVisible(true)} />
      <ConfirmActionDialog
        visible={visible}
        title="Confirmar acao"
        message="Esta operacao nao pode ser desfeita."
        danger={danger}
        onCancel={() => setVisible(false)}
        onConfirm={() => setVisible(false)}
      />
    </>
  );
};

const meta = {
  title: 'UI/ConfirmActionDialog',
  component: ConfirmActionDialog,
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => <Demo />,
};

export const Danger = {
  render: () => <Demo danger />,
};
