import { DataListItem } from './DataListItem';
import { ListContainer } from './ListContainer';

const meta = {
  title: 'UI/DataListItem',
  component: DataListItem,
  tags: ['autodocs'],
  args: {
    title: 'Pedido #1205',
    subtitle: 'Mesa 7 · 3 itens',
    meta: 'Ha 4 min',
    status: 'default',
    onPress: () => {},
  },
};

export default meta;

export const Default = {};

export const Statuses = {
  render: () => (
    <ListContainer>
      <DataListItem title="Pedido #1205" subtitle="Urgente" meta="1 min" status="error" />
      <DataListItem title="Pedido #1206" subtitle="Em preparo" meta="3 min" status="warning" />
      <DataListItem title="Pedido #1207" subtitle="Pronto" meta="Agora" status="success" />
    </ListContainer>
  ),
};
