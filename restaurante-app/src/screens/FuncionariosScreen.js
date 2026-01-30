import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { criarFuncionario, listarFuncionarios, deletarFuncionario, atualizarFuncionario } from '../services/funcionarios';

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';


export default function FuncionariosScreen({ onClose }) {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalExcluirVisible, setModalExcluirVisible] = useState(false);
  const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState(null);
  const [editandoFuncionario, setEditandoFuncionario] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [funcao, setFuncao] = useState('garcom');

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const carregarFuncionarios = async () => {
    // console.log('[FuncionariosScreen] 🔄 Carregando funcionários...');
    setLoading(true);
    const result = await listarFuncionarios();
    // console.log('[FuncionariosScreen] 📊 Resultado da listagem:', result);
    if (result.success) {
      setFuncionarios(result.funcionarios);
      // console.log('[FuncionariosScreen] ✅ Funcionários carregados:', result.funcionarios.length);
    } else {
      // console.log('[FuncionariosScreen] ❌ Erro ao carregar:', result.error);
    }
    setLoading(false);
  };

  const handleCriarFuncionario = async () => {
    // console.log('[FuncionariosScreen] 🔵 handleCriarFuncionario chamado');
    // console.log('[FuncionariosScreen] 📋 Dados do formulário:', { nome, cpf, email, funcao, editandoFuncionario });

    if (!nome.trim() || !cpf.trim() || !email.trim()) {
      alert('⚠️ Atenção: Preencha todos os campos obrigatórios');
      return;
    }

    // Validar senha
    if (!editandoFuncionario && !senha.trim()) {
      alert('⚠️ Atenção: Digite uma senha');
      return;
    }

    // Se está editando e preencheu nova senha, validar tamanho
    if (senha.trim() && senha.length < 6) {
      alert('⚠️ Atenção: Senha deve ter no mínimo 6 caracteres');
      return;
    }

    // console.log('[FuncionariosScreen] ✅ Validações OK, iniciando salvamento...');
    setLoading(true);

    let result;
    if (editandoFuncionario) {
      // console.log('[FuncionariosScreen] ✏️ Modo edição');
      // Editar funcionário existente
      const dadosAtualizacao = {
        nome,
        cpf,
        email,
        funcao,
      };

      // Se preencheu nova senha, incluir nos dados
      if (senha.trim()) {
        dadosAtualizacao.senha = senha;
      }

      result = await atualizarFuncionario(editandoFuncionario.id, dadosAtualizacao);
    } else {
      // console.log('[FuncionariosScreen] ➕ Modo criação');
      // Criar novo funcionário
      result = await criarFuncionario({
        nome,
        cpf,
        email,

        senha,
        funcao,
        companyId: user.companyId || (user.company && user.company.id)
      });
    }

    // console.log('[FuncionariosScreen] 📊 Resultado:', result);

    if (result.success) {
      // console.log('[FuncionariosScreen] 🔄 Recarregando lista...');
      await carregarFuncionarios();
      setLoading(false);
      setModalVisible(false);
      limparForm();

      // Mensagem personalizada se foi recriado para trocar senha
      if (result.warning) {
        alert(result.warning);
      } else if (result.mensagem) {
        alert('✅ ' + result.mensagem);
      } else {
        alert(editandoFuncionario ? '✅ Funcionário atualizado com sucesso!' : '✅ Funcionário cadastrado com sucesso!');
      }
    } else {
      setLoading(false);
      alert('❌ Erro: ' + result.error);
    }
  };

  const handleEditar = (funcionario) => {
    setEditandoFuncionario(funcionario);
    setNome(funcionario.nome);
    setCpf(funcionario.cpf);
    setEmail(funcionario.email);
    setFuncao(funcionario.funcao);
    setSenha(''); // Não preenche senha ao editar
    setModalVisible(true);
  };

  const handleDesativar = (funcionario) => {
    setFuncionarioParaExcluir(funcionario);
    setModalExcluirVisible(true);
  };

  const confirmarExclusao = async () => {
    if (!funcionarioParaExcluir) return;

    // console.log('[FuncionariosScreen] 🔄 Deletando funcionário ID:', funcionarioParaExcluir.id);
    setLoading(true);
    setModalExcluirVisible(false);

    const result = await deletarFuncionario(funcionarioParaExcluir.id);
    setLoading(false);

    // console.log('[FuncionariosScreen] 📊 Resultado da exclusão:', result);

    if (result.success) {
      if (result.warning) {
        alert('✅ Funcionário excluído!\n\n⚠️ Observação: ' + result.warning);
      } else {
        alert('Funcionário excluído com sucesso!');
      }
      await carregarFuncionarios();
    } else {
      alert('Erro ao excluir: ' + (result.error || 'Erro desconhecido'));
    }

    setFuncionarioParaExcluir(null);
  };



  const limparForm = () => {
    setNome('');
    setCpf('');
    setEmail('');
    setSenha('');
    setFuncao('garcom');
    setEditandoFuncionario(null);
  };

  const getFuncaoLabel = (func) => {
    const labels = {
      garcom: 'Garçom',
      churrasqueiro: 'Cozinheiro(a)', // Legacy
      cozinheiro: 'Cozinheiro(a)',
      montagem: 'Montagem',
      admin: 'Administrador',
    };
    return labels[func] || func;
  };

  const getFuncaoColor = (func) => {
    const colors = {
      garcom: '#4A90E2',
      churrasqueiro: '#E5B84A', // Legacy
      cozinheiro: '#E5B84A',
      montagem: '#7ED321',
      admin: '#8B2F2F',
    };
    return colors[func] || '#999';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.headerLeftButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        ) : <View style={styles.headerLeftButton} />}

        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="people" size={28} color="#FFF" />
            <Text style={styles.headerTitle}>Funcionários</Text>
          </View>
          <Text style={styles.headerSubtitle}>Logado: {user?.nome}</Text>
        </View>

        <View style={styles.headerRightButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Botão Adicionar */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ NOVO FUNCIONÁRIO</Text>
        </TouchableOpacity>

        {/* Lista de Funcionários */}
        <Text style={styles.sectionTitle}>Funcionários Cadastrados ({funcionarios.length})</Text>

        {loading && funcionarios.length === 0 ? (
          <Text style={styles.emptyText}>Carregando...</Text>
        ) : funcionarios.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum funcionário cadastrado</Text>
        ) : (
          funcionarios.map((func) => (
            <View key={func.id} style={styles.funcionarioCard}>
              <View style={styles.funcionarioHeader}>
                <Text style={styles.funcionarioNome}>{func.nome}</Text>
                <View style={[styles.funcaoBadge, { backgroundColor: getFuncaoColor(func.funcao) }]}>
                  <Text style={styles.funcaoText}>{getFuncaoLabel(func.funcao)}</Text>
                </View>
              </View>

              <Text style={styles.funcionarioInfo}>CPF: {func.cpf}</Text>
              <Text style={styles.funcionarioInfo}>Email: {func.email}</Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.editarBtn}
                  onPress={() => handleEditar(func)}
                >
                  <Text style={styles.editarText}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.desativarBtn}
                  onPress={() => {
                    // console.log('[FuncionariosScreen] 🖱️ Botão Excluir clicado para:', func.nome);
                    handleDesativar(func);
                  }}
                >
                  <Text style={styles.desativarText}>🗑️ Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Cadastro */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editandoFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  limparForm();
                }}
                style={styles.closeModalBtn}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.label}>CPF</Text>
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="joao@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>
                {editandoFuncionario ? 'Nova Senha (deixe vazio para manter a atual)' : 'Senha (mínimo 6 caracteres)'}
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={editandoFuncionario ? 'Digite nova senha ou deixe vazio' : '••••••'}
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!mostrarSenha}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                >
                  <Text style={styles.passwordToggleText}>
                    {mostrarSenha ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>

              {editandoFuncionario && senha.length > 0 && senha.length < 6 && (
                <Text style={styles.helperText}>
                  ⚠️ Nova senha deve ter no mínimo 6 caracteres
                </Text>
              )}

              <Text style={styles.label}>Função</Text>
              <View style={styles.funcaoButtons}>
                {['garcom', 'cozinheiro', 'montagem', 'admin'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.funcaoButton,
                      funcao === f && styles.funcaoButtonActive,
                      { borderColor: getFuncaoColor(f) }
                    ]}
                    onPress={() => setFuncao(f)}
                  >
                    <Text style={[
                      styles.funcaoButtonText,
                      funcao === f && { color: getFuncaoColor(f), fontWeight: '700' }
                    ]}>
                      {getFuncaoLabel(f)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editandoFuncionario && (
                <TouchableOpacity
                  style={styles.resetPasswordBtn}
                  onPress={() => {
                    Alert.alert(
                      'Redefinir Senha',
                      `Deseja enviar um email de redefinição de senha para:\n${email}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Enviar Email',
                          onPress: async () => {
                            try {
                              await sendPasswordResetEmail(auth, email.trim());
                              alert('✅ Email de redefinição enviado com sucesso!');
                            } catch (error) {
                              alert('Erro ao enviar: ' + error.message);
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.resetPasswordText}>📧 Enviar Email de Redefinição de Senha</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  limparForm();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleCriarFuncionario}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>
                  {loading ? 'Salvando...' : editandoFuncionario ? 'Atualizar' : 'Cadastrar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        visible={modalExcluirVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalExcluirVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalExcluirContent}>
            <Text style={styles.modalExcluirTitle}>⚠️ Confirmar Exclusão</Text>
            <Text style={styles.modalExcluirText}>
              Tem certeza que deseja excluir{'\n'}
              <Text style={styles.modalExcluirNome}>{funcionarioParaExcluir?.nome}</Text>?
            </Text>
            <Text style={styles.modalExcluirWarning}>
              O funcionário não poderá mais fazer login no sistema.
            </Text>

            <View style={styles.modalExcluirButtons}>
              <TouchableOpacity
                style={[styles.modalExcluirBtn, styles.modalExcluirCancelar]}
                onPress={() => {
                  setModalExcluirVisible(false);
                  setFuncionarioParaExcluir(null);
                }}
              >
                <Text style={styles.modalExcluirCancelarText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalExcluirBtn, styles.modalExcluirConfirmar]}
                onPress={confirmarExclusao}
              >
                <Text style={styles.modalExcluirConfirmarText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  headerLeftButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerRightButton: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#E5B84A',
    fontSize: 12,
    marginTop: 4,
  },

  content: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    backgroundColor: '#8B2F2F',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 30,
  },
  funcionarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  funcionarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  funcionarioNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
    flex: 1,
  },
  funcaoBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  funcaoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  funcionarioInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE0',
  },
  editarBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    borderRadius: 8,
  },
  editarText: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '600',
  },
  desativarBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  desativarText: {
    color: '#E74C3C',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F1E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 24,
    color: '#8B2F2F',
    fontWeight: '300',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B2F2F',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  inputDisabled: {
    backgroundColor: '#EAEAEA',
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#E74C3C',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
  },
  passwordToggle: {
    padding: 12,
  },
  passwordToggleText: {
    fontSize: 20,
  },
  funcaoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  funcaoButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0D8C8',
    alignItems: 'center',
  },
  funcaoButtonActive: {
    backgroundColor: '#F5F1E8',
  },
  funcaoButtonText: {
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#E0D8C8',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#8B2F2F',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalExcluirContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  modalExcluirTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalExcluirText: {
    fontSize: 16,
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  modalExcluirNome: {
    fontWeight: '700',
    color: '#8B2F2F',
  },
  modalExcluirWarning: {
    fontSize: 13,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 25,
    fontStyle: 'italic',
  },
  modalExcluirButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalExcluirBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalExcluirCancelar: {
    backgroundColor: '#E0D8C8',
  },
  modalExcluirCancelarText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  modalExcluirConfirmar: {
    backgroundColor: '#E74C3C',
  },
  modalExcluirConfirmarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resetPasswordBtn: {
    marginTop: 20,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  resetPasswordText: {
    color: '#3498DB',
    fontWeight: '600',
    fontSize: 14,
  },
});
