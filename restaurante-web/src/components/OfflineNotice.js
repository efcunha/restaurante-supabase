import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import Constants from 'expo-constants';

const OfflineNotice = () => {
    const netInfo = useNetInfo();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Only show offline if explicitly disconnected
        // Initial state might be null/unknown, ignore that
        if (netInfo.isConnected === false) {
            setIsOffline(true);
        } else {
            setIsOffline(false);
        }
    }, [netInfo.isConnected]);

    if (!isOffline) return null;

    return (
        <View style={styles.offlineContainer}>
            <Text style={styles.offlineText}>📡 Sem conexão - Modo Offline (Persistido)</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    offlineContainer: {
        backgroundColor: '#b52424', // Red warning
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        width: Dimensions.get('window').width,
        position: 'absolute',
        top: Platform.OS === 'ios' ? Constants.statusBarHeight : 0,
        zIndex: 9999,
    },
    offlineText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    }
});

export default OfflineNotice;
