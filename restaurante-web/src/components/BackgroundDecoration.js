import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function BackgroundDecoration() {
  return (
    <View style={[styles.container, { pointerEvents: 'none' }]}>
      {/* Cacto esquerdo superior */}
      <View style={[styles.decoration, styles.cactoLeft]}>
        <View style={styles.cactoBody}>
          <View style={[styles.cactoBranch, styles.branchLeft]} />
          <View style={[styles.cactoBranch, styles.branchRight]} />
        </View>
      </View>

      {/* Alho direito superior */}
      <View style={[styles.decoration, styles.alhoRight]}>
        <View style={styles.alhoCircle} />
        <View style={[styles.alhoCircle, styles.alhoCircle2]} />
        <View style={[styles.alhoCircle, styles.alhoCircle3]} />
      </View>

      {/* Fogo inferior esquerdo */}
      <View style={[styles.decoration, styles.fireLeft]}>
        <View style={[styles.flame, styles.flame1]} />
        <View style={[styles.flame, styles.flame2]} />
        <View style={[styles.flame, styles.flame3]} />
      </View>

      {/* Tempero inferior direito */}
      <View style={[styles.decoration, styles.spiceRight]}>
        <View style={styles.spiceLeaf} />
        <View style={[styles.spiceLeaf, styles.spiceLeaf2]} />
        <View style={[styles.spiceLeaf, styles.spiceLeaf3]} />
      </View>
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
    opacity: 0.25,
    zIndex: 0,
  },
  decoration: {
    position: 'absolute',
  },

  // Cacto
  cactoLeft: {
    top: 100,
    left: -30,
  },
  cactoBody: {
    width: 60,
    height: 120,
    backgroundColor: '#7A9B7F',
    borderRadius: 30,
    position: 'relative',
  },
  cactoBranch: {
    width: 30,
    height: 40,
    backgroundColor: '#7A9B7F',
    borderRadius: 15,
    position: 'absolute',
  },
  branchLeft: {
    left: -20,
    top: 30,
    transform: [{ rotate: '-20deg' }],
  },
  branchRight: {
    right: -20,
    top: 50,
    transform: [{ rotate: '20deg' }],
  },

  // Alho
  alhoRight: {
    top: 80,
    right: -20,
  },
  alhoCircle: {
    width: 50,
    height: 50,
    backgroundColor: '#E8DCC8',
    borderRadius: 25,
    marginBottom: 5,
  },
  alhoCircle2: {
    width: 40,
    height: 40,
    marginLeft: 10,
  },
  alhoCircle3: {
    width: 35,
    height: 35,
    marginLeft: 20,
  },

  // Fogo
  fireLeft: {
    bottom: 150,
    left: 20,
  },
  flame: {
    width: 40,
    height: 60,
    backgroundColor: '#E5B84A',
    borderRadius: 20,
    position: 'absolute',
  },
  flame1: {
    left: 0,
    bottom: 0,
    transform: [{ skewY: '-10deg' }],
  },
  flame2: {
    left: 25,
    bottom: 10,
    height: 50,
    width: 35,
    backgroundColor: '#D4A63A',
  },
  flame3: {
    left: 50,
    bottom: 5,
    height: 45,
    width: 30,
  },

  // Tempero (folhas)
  spiceRight: {
    bottom: 120,
    right: 10,
  },
  spiceLeaf: {
    width: 50,
    height: 20,
    backgroundColor: '#7A9B7F',
    borderRadius: 10,
    position: 'absolute',
    transform: [{ rotate: '30deg' }],
  },
  spiceLeaf2: {
    left: 20,
    top: 15,
    transform: [{ rotate: '-10deg' }],
  },
  spiceLeaf3: {
    left: 10,
    top: 30,
    transform: [{ rotate: '60deg' }],
  },
});
