import { Dimensions, Platform } from 'react-native';
import { useState, useEffect } from 'react';

export interface ResponsiveValues {
  width: number;
  height: number;
  isTablet: boolean;
  isSmallPhone: boolean;
  horizontalPadding: number;
  verticalPadding: number;
  modalWidth: string;
  modalMaxWidth: number;
  inputMaxWidth: number | string;
  numColumns: number;
  fontSize: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export const useResponsive = (): ResponsiveValues => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isTablet = width >= 768;
  const isSmallPhone = width < 375;

  return {
    width,
    height,
    isTablet,
    isSmallPhone,
    horizontalPadding: isTablet ? 40 : isSmallPhone ? 16 : 20,
    verticalPadding: isTablet ? 30 : isSmallPhone ? 16 : 20,
    modalWidth: isTablet ? '70%' : '90%',
    modalMaxWidth: isTablet ? 600 : 400,
    inputMaxWidth: isTablet ? 500 : '100%',
    numColumns: isTablet ? 3 : 2,
    fontSize: {
      small: isTablet ? 14 : 12,
      medium: isTablet ? 16 : 14,
      large: isTablet ? 20 : 18,
      xlarge: isTablet ? 24 : 22,
    },
    spacing: {
      xs: isTablet ? 6 : 4,
      sm: isTablet ? 10 : 8,
      md: isTablet ? 16 : 12,
      lg: isTablet ? 24 : 20,
      xl: isTablet ? 32 : 24,
    },
  };
};
