import { ReactNode } from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface AdminActionCardProps {
  name: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  subtitle?: string;
  cardStyle?: ViewStyle;
  nameStyle?: TextStyle;
  arrowStyle?: TextStyle;
}
