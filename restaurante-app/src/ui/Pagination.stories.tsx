import { Pagination } from '../components/ui-next/Pagination';

const meta = {
  title: 'UI/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: {
    page: 1,
    totalPages: 5,
    onPageChange: () => {},
  },
};

export default meta;
export const FirstPage = {};

export const MiddlePage = {
  args: { page: 3, totalPages: 5 },
};

export const LastPage = {
  args: { page: 5, totalPages: 5 },
};
