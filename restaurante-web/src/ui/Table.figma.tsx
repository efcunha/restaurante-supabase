import figma from '@figma/code-connect';
import { Table } from '../components/ui-next/Table';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=7:4', {
  example: () => <Table columns={[]} rows={[]} rowKey={(_, index) => String(index)} />,
});
