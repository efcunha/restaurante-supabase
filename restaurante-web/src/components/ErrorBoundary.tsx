import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../theme/colors';
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    
    // Tratamento para erro de carregamento de chunk (ChunkLoadError) que acontece no web
    // quando uma nova versão é publicada na Vercel e o usuário tenta navegar
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      (error.message && error.message.toLowerCase().includes('loading chunk'));

    if (isChunkError && Platform.OS === 'web') {
      console.log('ChunkLoadError detectado. Recarregando a página para buscar a versão mais recente...');
      window.location.reload();
      return;
    }

    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>💥 Ops! Ocorreu um erro.</Text>
            <Text style={styles.subtitle}>O aplicativo encontrou um erro inesperado.</Text>
            
            <View style={styles.box}>
              <Text style={styles.errorType}>{this.state.error?.name}</Text>
              <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
            </View>

            {this.state.errorInfo && (
                <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                </Text>
            )}

            <TouchableOpacity 
                style={styles.button}
                onPress={() => this.setState({ hasError: false, error: null })}
            >
                <Text style={styles.buttonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // Red background to be obvious
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  scroll: {
    paddingBottom: 40
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.dangerSurface,
    marginBottom: 20,
  },
  box: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  errorType: {
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 5,
  },
  errorMessage: {
    color: colors.text,
    fontSize: 16,
  },
  stackTrace: {
    color: colors.dangerSurface,
    fontSize: 10,
    marginTop: 10,
    fontFamily: 'monospace'
  },
  button: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  }
});
