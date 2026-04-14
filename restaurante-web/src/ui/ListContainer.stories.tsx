import { DataListItem, ListContainer } from './index';

const meta = {
  title: 'UI/ListContainer',
  component: ListContainer,
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
    <ListContainer>
      <DataListItem title="Mesa 1" subtitle="2 comandas" />
      <DataListItem title="Mesa 2" subtitle="1 comanda" />
    </ListContainer>
  ),
};
