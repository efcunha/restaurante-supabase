import { Text } from 'react-native';
import { Table } from '../components/ui-next/Table';

type Row = {
  id: string;
  order: string;
  table: string;
  total: string;
  status: string;
};

const columns = [
  { key: 'order', title: 'Pedido' },
  { key: 'table', title: 'Mesa' },
  { key: 'total', title: 'Total' },
  {
    key: 'status',
    title: 'Status',
    render: (value: unknown) => <Text>{String(value)}</Text>,
  },
] as const;

const rows: Row[] = [
  { id: '1', order: '#1201', table: 'Mesa 2', total: 'R$ 84,90', status: 'Aberto' },
  { id: '2', order: '#1202', table: 'Mesa 4', total: 'R$ 58,20', status: 'Pago' },
];

const meta = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
  args: {
    columns,
    rows,
    rowKey: (row: Row) => row.id,
    emptyLabel: 'Sem registros',
  },
};

export default meta;

export const Default = {};

export const Empty = {
  args: {
    rows: [],
  },
};
