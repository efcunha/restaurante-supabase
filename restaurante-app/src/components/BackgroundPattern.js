import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

export default function BackgroundPattern() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/fundodetela1.webp')}
        style={styles.patternImage}
        resizeMode="repeat"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  patternImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
});
