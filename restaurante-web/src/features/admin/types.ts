import { ReactNode } from 'react';
import { TextStyle, ViewStyle } from 'react-native';

export interface AdminSectionProps {
  title: string;
  children: ReactNode;
  showDivider?: boolean;
}

export interface BaseAdminModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export interface AdminSlideModalProps extends BaseAdminModalProps {
  statusBarTranslucent?: boolean;
  hardwareAccelerated?: boolean;
}

export interface AdminCaixaModalProps extends BaseAdminModalProps {
  title: string;
  headerStyle?: ViewStyle;
  closeButtonStyle?: TextStyle;
  titleStyle?: TextStyle;
}

export interface AdminActionCardProps {
  name: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  subtitle?: string;
  cardStyle?: ViewStyle;
  nameStyle?: ViewStyle;
  arrowStyle?: ViewStyle;
}
