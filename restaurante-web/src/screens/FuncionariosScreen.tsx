import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, Alert, Modal, ScrollView } from 'react-native';
// @ts-ignore
import KeyboardWrapper from '../components/KeyboardWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
// @ts-ignore
import { criarFuncionario, listarFuncionarios, deletarFuncionario, atualizarFuncionario } from '../services/FuncionariosService';
import { supabase } from '../config/SupabaseConfig';

interface Props {
  onClose?: () => void;
}

export default function FuncionariosScreen({ onClose }: Props) {
  const { user } = useAuth();
  const { isTablet, horizontalPadding, modalWidth, modalMaxWidth, inputMaxWidth } = useResponsive();
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalExcluirVisible, setModalExcluirVisible] = useState(false);
  const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState<any>(null);
  const [editandoFuncionario, setEditandoFuncionario] = useState<any>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [senha, setSenha] = useState('');
  const [funcao, setFuncao] = useState('garcom');
  const [senhaErrors, setSenhaErrors] = useState<string[]>([]);

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const carregarFuncionarios = async () => {
    console.log('[FuncionariosScreen] 🔄 Carregando funcionários...');
    setLoading(true);

    // Pass companyId from context to avoid redundant query
    const result = await listarFuncionarios(user?.companyId);

    console.log('[FuncionariosScreen] 📊 Resultado da listagem:', result);
    if (result.success) {
      console.log('[FuncionariosScreen] 📋 Funcionários recebidos:', result.funcionarios.map(f => ({ id: f.id, nome: f.nome })));
      setFuncionarios(result.funcionarios);
      console.log('[FuncionariosScreen] ✅ Funcionários carregados:', result.funcionarios.length);
    } else {
      console.log('[FuncionariosScreen] ❌ Erro ao carregar:', result.error);
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

    // Validar senha se foi preenchida
    if (senha.trim()) {
      const validation = validatePassword(senha);
      if (!validation.valid) {
        alert('⚠️ Senha não atende aos requisitos:\n\n' + validation.errors.join('\n'));
        setSenhaErrors(validation.errors);
        return;
      }
    }

    // Validar senha obrigatória para novo funcionário
    if (!editandoFuncionario && !senha.trim()) {
      alert('⚠️ Atenção: Digite uma senha');
      return;
    }

    // console.log('[FuncionariosScreen] ✅ Validações OK, iniciando salvamento...');
    setLoading(true);

    let result;
    if (editandoFuncionario) {
      // console.log('[FuncionariosScreen] ✏️ Modo edição');
      // Editar funcionário existente
      const dadosAtualizacao: any = {
        nome,
        cpf,
        email,
        phone,
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
        phone,
        senha,
        funcao,
        // @ts-ignore
        companyId: user.companyId || (user.company && user.company.id)
      });
    }

    if (result.success) {
      console.log('[FuncionariosScreen] 🔄 Recarregando lista...');
      setModalVisible(false);
      limparForm();
      setLoading(true);
      await carregarFuncionarios();
      setLoading(false);

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

  const handleEditar = (funcionario: any) => {
    setEditandoFuncionario(funcionario);
    setNome(funcionario.nome);
    setCpf(formatCPF(funcionario.cpf));
    setEmail(funcionario.email);
    setPhone(formatPhone(funcionario.phone || ''));
    setFuncao(funcionario.funcao);
    setSenha(''); // Não preenche senha ao editar
    setModalVisible(true);
  };

  const handleDesativar = (funcionario: any) => {
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
    setPhone('');
    setSenha('');
    setFuncao('garcom');
    setSenhaErrors([]);
    setEditandoFuncionario(null);
  };

  // Validação de senha forte
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Mínimo 6 caracteres');
    }
    if (password.length > 10) {
      errors.push('Máximo 10 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Pelo menos 1 letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Pelo menos 1 letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Pelo menos 1 número');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Pelo menos 1 caractere especial (!@#$%^&*...)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // @ts-ignore
  const formatCPF = (cpf) => {
    if (!cpf) return '';
    // Remove tudo que não é dígito
    const numbers = cpf.replace(/\D/g, '');
    // Aplica a máscara: 000.000.000-00
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  // @ts-ignore
  const formatPhone = (phone) => {
    if (!phone) return '';
    // Remove tudo que não é dígito
    const numbers = phone.replace(/\D/g, '');
    // Aplica a máscara: (00) 00000-0000 ou (00) 0000-0000
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const getFuncaoLabel = (func) => {
    const labels: any = {
      garcom: 'Garçom',
      churrasqueiro: 'Cozinheiro(a)', // Legacy
      cozinheiro: 'Cozinheiro(a)',
      montagem: 'Montagem',
      admin: 'Administrador',
      manager: 'Administrador',
      waiter: 'Garçom',
      kitchen: 'Cozinha',
      entregador: 'Entregador',
    };
    return labels[func] || func;
  };

  const getFuncaoColor = (func) => {
    const colors: any = {
      garcom: '#4A90E2',
      churrasqueiro: '#B45309', // Legacy
      cozinheiro: '#B45309',
      montagem: '#7ED321',
      admin: '#8B2F2F',
      manager: '#8B2F2F',
      waiter: '#4A90E2',
      kitchen: '#B45309',
      entregador: '#E17055', // Cor distinta para entregador
    };
    return colors[func] || '#999';
  };

  // Componente memoizado para o card de funcionário
  const renderFuncionarioCard = useCallback(({ item: func }: { item: any }) => (
    <View style={styles.funcionarioCard}>
      <View style={styles.funcionarioHeader}>
        <Text style={styles.funcionarioNome}>{func.nome}</Text>
        <View style={[styles.funcaoBadge, { backgroundColor: getFuncaoColor(func.funcao) }]}>
          <Text style={styles.funcaoText}>{getFuncaoLabel(func.funcao)}</Text>
        </View>
      </View>

      <Text style={styles.funcionarioInfo}>CPF: {formatCPF(func.cpf)}</Text>
      <Text style={styles.funcionarioInfo}>Email: {func.email}</Text>
      {func.phone && <Text style={styles.funcionarioInfo}>Telefone: {formatPhone(func.phone)}</Text>}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editarBtn}
          onPress={() => handleEditar(func)}
        >
          <Text style={styles.editarText}>✏️ Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.desativarBtn}
          onPress={() => handleDesativar(func)}
        >
          <Text style={styles.desativarText}>🗑️ Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  const ListHeaderComponent = useCallback(() => (
    <>
      {/* Botão Adicionar */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ NOVO FUNCIONÁRIO</Text>
      </TouchableOpacity>

      {/* Título da Lista */}
      <Text style={styles.sectionTitle}>Funcionários Cadastrados ({funcionarios.length})</Text>
    </>
  ), [funcionarios.length]);

  const ListEmptyComponent = useCallback(() => (
    <Text style={styles.emptyText}>
      {loading && funcionarios.length === 0 ? 'Carregando...' : 'Nenhum funcionário cadastrado'}
    </Text>
  ), [loading, funcionarios.length]);

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people" size={28} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Funcionários</Text>
          </View>
          <Text style={styles.headerSubtitle}>Logado: {user?.nome}</Text>
        </View>

        <View style={styles.headerRightButton} />
      </View>

      <FlatList
        data={funcionarios}
        renderItem={renderFuncionarioCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={[styles.content, { 
          paddingHorizontal: horizontalPadding,
          paddingBottom: 100,
        }]}
        style={{ flex: 1 }}
      />

      {/* Modal de Cadastro */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardWrapper style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            width: modalWidth,
            maxWidth: modalMaxWidth,
            padding: isTablet ? 30 : 25,
          }]}>
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
                style={[styles.input, { maxWidth: inputMaxWidth }]}
                placeholder="Ex: João Silva"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.label}>CPF</Text>
              <TextInput
                style={[styles.input, { maxWidth: inputMaxWidth }]}
                placeholder="000.000.000-00"
                value={cpf}
                onChangeText={(text) => {
                  // Remove tudo que não é dígito
                  const numbers = text.replace(/\D/g, '');
                  // Limita a 11 dígitos
                  const limited = numbers.substring(0, 11);
                  // Aplica formatação enquanto digita
                  let formatted = limited;
                  if (limited.length > 3) {
                    formatted = limited.substring(0, 3) + '.' + limited.substring(3);
                  }
                  if (limited.length > 6) {
                    formatted = limited.substring(0, 3) + '.' + limited.substring(3, 6) + '.' + limited.substring(6);
                  }
                  if (limited.length > 9) {
                    formatted = limited.substring(0, 3) + '.' + limited.substring(3, 6) + '.' + limited.substring(6, 9) + '-' + limited.substring(9);
                  }
                  setCpf(formatted);
                }}
                keyboardType="numeric"
                maxLength={14}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, { maxWidth: inputMaxWidth }]}
                placeholder="joao@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Telefone (opcional)</Text>
              <TextInput
                style={[styles.input, { maxWidth: inputMaxWidth }]}
                placeholder="(00) 00000-0000"
                value={phone}
                onChangeText={(text) => {
                  // Remove tudo que não é dígito
                  const numbers = text.replace(/\D/g, '');
                  // Limita a 11 dígitos
                  const limited = numbers.substring(0, 11);
                  // Aplica formatação enquanto digita
                  let formatted = limited;
                  if (limited.length > 2) {
                    formatted = '(' + limited.substring(0, 2) + ') ' + limited.substring(2);
                  }
                  if (limited.length > 7) {
                    formatted = '(' + limited.substring(0, 2) + ') ' + limited.substring(2, 7) + '-' + limited.substring(7);
                  }
                  setPhone(formatted);
                }}
                keyboardType="phone-pad"
                maxLength={15}
              />

              {/* Senha apenas para novo funcionário */}
              {!editandoFuncionario && (
                <>
                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••"
                      value={senha}
                      onChangeText={(text) => {
                        setSenha(text);
                        // Validar em tempo real
                        if (text.trim()) {
                          const validation = validatePassword(text);
                          setSenhaErrors(validation.errors);
                        } else {
                          setSenhaErrors([]);
                        }
                      }}
                      secureTextEntry={!mostrarSenha}
                      maxLength={10}
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

                  {/* Requisitos de senha */}
                  <View style={styles.passwordRequirements}>
                    <Text style={styles.requirementsTitle}>Requisitos da senha:</Text>
                    <Text style={[styles.requirementItem, senha.length >= 6 && senha.length <= 10 && styles.requirementMet]}>
                      {senha.length >= 6 && senha.length <= 10 ? '✓' : '○'} 6 a 10 caracteres
                    </Text>
                    <Text style={[styles.requirementItem, /[A-Z]/.test(senha) && styles.requirementMet]}>
                      {/[A-Z]/.test(senha) ? '✓' : '○'} Letra maiúscula
                    </Text>
                    <Text style={[styles.requirementItem, /[a-z]/.test(senha) && styles.requirementMet]}>
                      {/[a-z]/.test(senha) ? '✓' : '○'} Letra minúscula
                    </Text>
                    <Text style={[styles.requirementItem, /[0-9]/.test(senha) && styles.requirementMet]}>
                      {/[0-9]/.test(senha) ? '✓' : '○'} Número
                    </Text>
                    <Text style={[styles.requirementItem, /[!@#$%^&*(),.?":{}|<>]/.test(senha) && styles.requirementMet]}>
                      {/[!@#$%^&*(),.?":{}|<>]/.test(senha) ? '✓' : '○'} Caractere especial (!@#$%...)
                    </Text>
                  </View>

                  {senhaErrors.length > 0 && senha.trim() && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorTitle}>⚠️ Problemas com a senha:</Text>
                      {senhaErrors.map((error, index) => (
                        <Text key={index} style={styles.errorText}>• {error}</Text>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Aviso para edição */}
              {editandoFuncionario && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Para alterar a senha, o funcionário deve usar "Esqueci minha senha" na tela de login.
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Função</Text>
              <View style={styles.funcaoButtons}>
                {['garcom', 'cozinheiro', 'montagem', 'admin', 'entregador'].map((f) => (
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
                              const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                                redirectTo: 'your-app://reset-password'
                              });
                              if (error) throw error;
                              alert('✅ Email de redefinição enviado com sucesso!');
                            } catch (error: any) {
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
        </KeyboardWrapper>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        visible={modalExcluirVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalExcluirVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalExcluirContent, {
            width: modalWidth,
            maxWidth: 400,
          }]}>
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
    backgroundColor: '#F5F5DC',
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
    color: '#B45309',
    fontSize: 12,
    marginTop: 4,
  },

  content: {
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
    alignItems: 'center',
    alignSelf: 'center',
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
  passwordRequirements: {
    backgroundColor: '#F5F1E8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 6,
  },
  requirementItem: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  requirementMet: {
    color: '#27AE60',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#E74C3C',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E74C3C',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#E74C3C',
    marginBottom: 2,
  },
  infoBox: {
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#3498DB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
});
