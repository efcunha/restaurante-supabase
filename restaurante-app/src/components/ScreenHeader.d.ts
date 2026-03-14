import type { ComponentType } from 'react';

export interface ScreenHeaderProps {
  title: string;
  onBack?: (() => void) | null;
}

declare const ScreenHeader: ComponentType<ScreenHeaderProps>;

export default ScreenHeader;