import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

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
    backgroundColor: '#8B2F2F', // Red background to be obvious
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  scroll: {
    paddingBottom: 40
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFD7D7',
    marginBottom: 20,
  },
  box: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  errorType: {
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 5,
  },
  errorMessage: {
    color: '#333',
    fontSize: 16,
  },
  stackTrace: {
    color: '#FFD7D7',
    fontSize: 10,
    marginTop: 10,
    fontFamily: 'monospace'
  },
  button: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#8B2F2F',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
