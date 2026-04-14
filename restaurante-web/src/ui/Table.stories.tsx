import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Text } from 'react-native';
import { Table } from '../components/ui-next/Table';

type Row = {
  id: string;
  order: string;
  table: string;
  total: string;
  status: string;
};

type SortDir = 'asc' | 'desc';

type TableStoryColumn = {
  key: keyof Row;
  title: string;
  width?: number;
  sortable?: boolean;
  render?: (value: Row[keyof Row], row: Row) => ReactNode;
};

type TableStoryArgs = {
  columns: TableStoryColumn[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyLabel?: string;
  loading?: boolean;
  sortable?: boolean;
  onSort?: (key: keyof Row, dir: SortDir) => void;
};

const columns: TableStoryColumn[] = [
  { key: 'order', title: 'Pedido' },
  { key: 'table', title: 'Mesa' },
  { key: 'total', title: 'Total' },
  {
    key: 'status',
    title: 'Status',
    render: (value: unknown) => <Text>{String(value)}</Text>,
  },
];

const rows: Row[] = [
  { id: '1', order: '#1201', table: 'Mesa 2', total: 'R$ 84,90', status: 'Aberto' },
  { id: '2', order: '#1202', table: 'Mesa 4', total: 'R$ 58,20', status: 'Pago' },
];

function StoryTable(args: TableStoryArgs) {
  return <Table<Row> {...args} />;
}

const meta: Meta<typeof StoryTable> = {
  title: 'UI/Table',
  component: StoryTable,
  tags: ['autodocs'],
  args: {
    columns,
    rows,
    rowKey: (row: Row) => row.id,
    emptyLabel: 'Sem registros',
  },
};

export default meta;
type Story = StoryObj<typeof StoryTable>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    rows: [],
  },
};
