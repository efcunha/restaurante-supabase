import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { cleanAllZeroValues } from '../utils/cleanZeroValueOrders';
import { diagnosticarComandasSuspeitas, corrigirComandasSuspeitas } from '../utils/diagnosticarComandas';

export default function AdminToolsModal({ visible, onClose, companyId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [diagnostico, setDiagnostico] = useState(null);

  const handleDiagnosticar = async () => {
    try {
      setLoading(true);
      setDiagnostico(null);
      
      const relatorio = await diagnosticarComandasSuspeitas(companyId);
      setDiagnostico(relatorio);
      setLoading(false);
      
      const isWeb = typeof window !== 'undefined' && window.alert;
      const mensagem = `📊 Diagnóstico Completo\n\n` +
        `Total: ${relatorio.total}\n` +
        `✅ Válidas: ${relatorio.validas}\n` +
        `⚠️ Suspeitas: ${relatorio.suspeitas}\n` +
        `⚠️ Sem valor: ${relatorio.semValor}`;
      
      if (isWeb) {
        window.alert(mensagem);
      } else {
        Alert.alert('Diagnóstico', mensagem);
      }
    } catch (error) {
      console.error('❌ Erro ao diagnosticar:', error);
      setLoading(false);
      
      const isWeb = typeof window !== 'undefined' && window.alert;
      if (isWeb) {
        window.alert(`❌ Erro: ${error.message}`);
      } else {
        Alert.alert('Erro', error.message);
      }
    }
  };

  const handleCorrigirComandas = async () => {
    try {
      const isWeb = typeof window !== 'undefined' && window.confirm;
      
      const confirmado = isWeb 
        ? window.confirm('⚠️ ATENÇÃO\n\nIsso vai recalcular os valores das comandas suspeitas.\n\nDeseja continuar?')
        : await new Promise(resolve => {
            Alert.alert(
              'Confirmar Correção',
              'Isso vai recalcular os valores das comandas suspeitas. Deseja continuar?',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Sim, Corrigir', style: 'destructive', onPress: () => resolve(true) }
              ]
            );
          });
      
      if (!confirmado) return;
      
      setLoading(true);
      const resultado = await corrigirComandasSuspeitas(companyId);
      setLoading(false);
      
      const mensagem = `✅ Correção Concluída!\n\nCorrigidas: ${resultado.corrigidas}\nErros: ${resultado.erros}`;
      
      if (isWeb) {
        window.alert(mensagem);
      } else {
        Alert.alert('Sucesso', mensagem);
      }
      
      // Recarregar diagnóstico
      handleDiagnosticar();
      
    } catch (error) {
      console.error('❌ Erro ao corrigir:', error);
      setLoading(false);
      
      const isWeb = typeof window !== 'undefined' && window.alert;
      if (isWeb) {
        window.alert(`❌ Erro: ${error.message}`);
      } else {
        Alert.alert('Erro', error.message);
      }
    }
  };

  const handleCleanZeroValues = async (dryRun = false) => {
    try {
      console.log('🧹 [AdminToolsModal] handleCleanZeroValues iniciado');
      console.log('🧹 [AdminToolsModal] dryRun:', dryRun);
      console.log('🧹 [AdminToolsModal] companyId:', companyId);
      
      setLoading(true);
      setResult(null);

      const result = await cleanAllZeroValues(companyId, dryRun);
      
      console.log('✅ [AdminToolsModal] Resultado recebido:', result);
      
      setResult(result);
      setLoading(false);

      if (!dryRun) {
        // Detectar se está no web ou mobile
        const isWeb = typeof window !== 'undefined' && window.alert;
        
        if (isWeb) {
          // Web: usar window.alert
          window.alert(`✅ Limpeza Concluída!\n\nPedidos deletados: ${result.pedidos.deleted}\nComandas deletadas: ${result.comandas.deleted}`);
        } else {
          // Mobile: usar Alert.alert
          Alert.alert(
            'Limpeza Concluída',
            `Pedidos deletados: ${result.pedidos.deleted}\nComandas deletadas: ${result.comandas.deleted}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ [AdminToolsModal] Erro:', error);
      setLoading(false);
      
      // Detectar se está no web ou mobile
      const isWeb = typeof window !== 'undefined' && window.alert;
      
      if (isWeb) {
        // Web: usar window.alert
        window.alert(`❌ Erro: ${error.message}`);
      } else {
        // Mobile: usar Alert.alert
        Alert.alert('Erro', error.message);
      }
    }
  };

  const confirmCleanup = () => {
    console.log('🔴 [AdminToolsModal] confirmCleanup chamado');
    console.log('🔴 [AdminToolsModal] companyId:', companyId);
    
    // Detectar se está no web ou mobile
    const isWeb = typeof window !== 'undefined' && window.confirm;
    
    if (isWeb) {
      // Web: usar window.confirm
      const confirmado = window.confirm('⚠️ ATENÇÃO\n\nIsso vai DELETAR permanentemente todos os pedidos e comandas com valores zerados.\n\nDeseja continuar?');
      
      if (confirmado) {
        console.log('✅ Usuário confirmou - iniciando limpeza');
        handleCleanZeroValues(false);
      } else {
        console.log('❌ Usuário cancelou');
      }
    } else {
      // Mobile: usar Alert.alert
      Alert.alert(
        'Confirmar Limpeza',
        'Isso vai DELETAR permanentemente todos os pedidos e comandas com valores zerados. Deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => console.log('❌ Usuário cancelou') },
          { 
            text: 'Sim, Deletar', 
            style: 'destructive',
            onPress: () => {
              console.log('✅ Usuário confirmou - iniciando limpeza');
              handleCleanZeroValues(false);
            }
          }
        ]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>🛠️ Ferramentas de Admin</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Diagnóstico de Comandas</Text>
              <Text style={styles.sectionDesc}>
                Identifica comandas com valores suspeitos (acima de R$ 10.000) que podem estar causando problemas nos gráficos.
              </Text>

              <TouchableOpacity 
                style={[styles.btn, styles.btnSecondary]} 
                onPress={handleDiagnosticar}
                disabled={loading}
              >
                <Text style={styles.btnSecondaryText}>
                  {loading ? 'Analisando...' : '🔍 Diagnosticar Comandas'}
                </Text>
              </TouchableOpacity>

              {diagnostico && diagnostico.suspeitas > 0 && (
                <TouchableOpacity 
                  style={[styles.btn, styles.btnWarning]} 
                  onPress={handleCorrigirComandas}
                  disabled={loading}
                >
                  <Text style={styles.btnText}>
                    {loading ? 'Corrigindo...' : '🔧 Corrigir Comandas Suspeitas'}
                  </Text>
                </TouchableOpacity>
              )}

              {diagnostico && (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultTitle}>📊 Diagnóstico:</Text>
                  <Text style={styles.resultText}>Total: {diagnostico.total}</Text>
                  <Text style={[styles.resultText, { color: colors.success }]}>
                    ✅ Válidas: {diagnostico.validas}
                  </Text>
                  {diagnostico.suspeitas > 0 && (
                    <Text style={[styles.resultText, { color: colors.danger }]}>
                      ⚠️ Suspeitas: {diagnostico.suspeitas}
                    </Text>
                  )}
                  {diagnostico.semValor > 0 && (
                    <Text style={[styles.resultText, { color: colors.warning }]}>
                      ⚠️ Sem valor: {diagnostico.semValor}
                    </Text>
                  )}
                  
                  {diagnostico.comandasSuspeitas && diagnostico.comandasSuspeitas.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.resultText, { fontWeight: 'bold' }]}>
                        Comandas Suspeitas:
                      </Text>
                      {diagnostico.comandasSuspeitas.slice(0, 5).map((c, idx) => (
                        <Text key={idx} style={[styles.resultText, { fontSize: 12, marginLeft: 10 }]}>
                          #{c.numero}: R$ {c.valor.toFixed(2)}
                        </Text>
                      ))}
                      {diagnostico.comandasSuspeitas.length > 5 && (
                        <Text style={[styles.resultText, { fontSize: 12, marginLeft: 10, fontStyle: 'italic' }]}>
                          ... e mais {diagnostico.comandasSuspeitas.length - 5}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🗑️ Limpeza de Dados</Text>
              <Text style={styles.sectionDesc}>
                Remove pedidos e comandas com valores zerados (R$ 0,00) do banco de dados.
                {'\n\n'}
                ⚠️ Isso inclui comandas abertas e canceladas com valor zero. Comandas pagas são preservadas.
              </Text>

              <TouchableOpacity 
                style={[styles.btn, styles.btnSecondary]} 
                onPress={() => handleCleanZeroValues(true)}
                disabled={loading}
              >
                <Text style={styles.btnSecondaryText}>
                  {loading ? 'Analisando...' : '🔍 Analisar (Dry Run)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btn, styles.btnDanger]} 
                onPress={confirmCleanup}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Limpando...' : '🗑️ Limpar Valores Zerados'}
                </Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Processando...</Text>
              </View>
            )}

            {result && !loading && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>📊 Resultado:</Text>
                <Text style={styles.resultText}>
                  Pedidos encontrados: {result.pedidos.found || 0}
                </Text>
                <Text style={styles.resultText}>
                  Pedidos deletados: {result.pedidos.deleted}
                </Text>
                <Text style={styles.resultText}>
                  Comandas encontradas: {result.comandas.found || 0}
                </Text>
                <Text style={styles.resultText}>
                  Comandas deletadas: {result.comandas.deleted}
                </Text>
                {(result.pedidos.errors + result.comandas.errors) > 0 && (
                  <Text style={[styles.resultText, { color: colors.danger }]}>
                    Erros: {result.pedidos.errors + result.comandas.errors}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.btnClose} onPress={onClose}>
            <Text style={styles.btnCloseText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeBtn: {
    padding: 5,
  },
  closeBtnText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  btn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnSecondaryText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnWarning: {
    backgroundColor: colors.warning || '#FF9800',
  },
  btnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
  },
  resultContainer: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text,
  },
  resultText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  btnClose: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  btnCloseText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
