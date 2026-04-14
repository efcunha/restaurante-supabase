import figma from '@figma/code-connect';
import { StateView } from './StateView';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=6:1', {
  example: () => <StateView state="loading" skeletonRows={4} />,
});
