import React from 'react';
import { Platform, View, StyleSheet, SafeAreaView } from 'react-native';

// PhonePreview: On web, constrains the app to a typical phone width and centers it.
// On native, renders children unchanged.
export default function PhonePreview({ children }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.page}>
      <View style={styles.frame}>
        <SafeAreaView style={styles.content}>{children}</SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
  },
  frame: {
    width: 390, // iPhone 14 width ~390px
    minHeight: 'calc(100vh - 32px)',
    backgroundColor: '#F5F1E8',
    borderRadius: 28,
    overflow: 'hidden',
    // Web shadows via RN-web shadow props
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  content: {
    flex: 1,
  },
});
