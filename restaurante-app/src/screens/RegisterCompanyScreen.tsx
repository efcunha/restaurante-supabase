import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { doc, setDoc, serverTimestamp, collection, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import { validateCPF, validateCNPJ } from '../utils/validation';
// @ts-ignore
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function RegisterCompanyScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [restaurantName, setRestaurantName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>('cpf');
  const [documentValue, setDocumentValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  // Formatter for display
  const formatDocument = (text: string, type: 'cpf' | 'cnpj') => {
    const numbers = text.replace(/\D/g, '');
    if (type === 'cpf') {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  };

  const handleDocumentChange = (text: string) => {
    setDocumentValue(formatDocument(text, documentType));
  };

  const handleRegister = async () => {
    if (!restaurantName || !adminName || !email || !password || !documentValue) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validation
    let docValidation;
    if (documentType === 'cpf') {
      docValidation = validateCPF(documentValue);
    } else {
      docValidation = validateCNPJ(documentValue);
    }

    if (!docValidation.isValid) {
      Alert.alert('Erro', docValidation.error);
      return;
    }

    const emailSanitized = email.toLowerCase().trim();
    const passwordSanitized = password.trim();

    try {
      setLoading(true);


      // 1. Create Auth User via Context (prevents auto-logout)
      const result = await register(emailSanitized, passwordSanitized);

      if (!result.success) {
        throw result.error;
      }

      const user = result.user;

      // 2. Create Company Document
      // Generate a new ID for the company
      const companyRef = doc(collection(db, 'companies'));
      const companyId = companyRef.id;

      await setDoc(companyRef, {
        name: restaurantName,
        createdAt: serverTimestamp(),
        plan: 'free',
        active: true,
        createdBy: user.uid,
        documentType: documentType,
        document: docValidation.value // Clean value (numbers only)
      });

      // 3. Create User Document linked to Company
      await setDoc(doc(db, 'users', user.uid), {
        name: adminName,
        email: emailSanitized,
        role: 'admin', // SaaS Admin
        funcao: 'admin', // Legacy compatibility
        companyId: companyId,
        createdAt: serverTimestamp(),
        active: true
      });

      // 4. Force reload or let AuthContext pick up the user data naturally?
      // AuthContext.login does a fetch, but we just set the data. 
      // User is already logged in (firebase-wise).
      // We might want to call something to refresh the User Profile in context.
      // But for now, let's just alert success. The AuthContext listener *might* kick in
      // but without isManualLogin=true (wait, we set it true in register!), it would survive.
      // However logic in onAuthStateChanged is complicated.

      Alert.alert(
        'Sucesso',
        'Conta criada com sucesso! Faça login novamente para carregar suas permissões.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }] // Force re-login to fetch Firestore data cleanly
      );

    } catch (error: any) {
      // TENTATIVA DE AUTO-RECUPERAÇÃO (SELF-HEALING)
      if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️ Email já existe. Tentando verificar se é um cadastro incompleto...');
        try {
          // Tenta logar com a senha fornecida
          const userCredential = await signInWithEmailAndPassword(auth, emailSanitized, passwordSanitized);
          const user = userCredential.user;

          // Verifica se já tem dados no Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            console.log('🛠️ Cadastro incompleto detectado. Recuperando...');

            // REPETE A CRIAÇÃO DE DADOS (Cópia da lógica acima)
            const companyRef = doc(collection(db, 'companies'));
            const companyId = companyRef.id;

            await setDoc(companyRef, {
              name: restaurantName,
              createdAt: serverTimestamp(),
              plan: 'free',
              active: true,
              createdBy: user.uid
            });

            await setDoc(userDocRef, {
              name: adminName,
              email: emailSanitized,
              role: 'admin',
              funcao: 'admin',
              companyId: companyId,
              createdAt: serverTimestamp(),
              active: true
            });

            Alert.alert(
              'Cadastro Recuperado',
              'Identificamos que seu cadastro anterior foi interrompido. Finalizamos ele agora!\n\nFaça login para entrar.',
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
            return; // Sair com sucesso
          } else {
            Alert.alert('Aviso', 'Este email já está cadastrado e ativo. Por favor, faça login.');
            return;
          }
        } catch (loginError: any) {
          // Se a senha estiver errada ou outro erro de login, cai aqui
          console.error('Erro na recuperação:', loginError);
          if (loginError.code === 'auth/wrong-password') {
            Alert.alert('Erro', 'Este email já está cadastrado, mas a senha informada está incorreta.');
          } else {
            Alert.alert('Erro', 'Email já cadastrado. Tente fazer login ou usar outro email.');
          }
          return;
        }
      }

      console.error('Registration Error:', error);
      let msg = 'Erro ao criar conta';
      if (error.code === 'auth/invalid-email') msg = 'Email inválido';
      if (error.code === 'auth/weak-password') msg = 'Senha muito fraca';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Gerencie seu restaurante de forma inteligente</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Tipo de Documento</Text>
          <View style={styles.docTypeContainer}>
            <TouchableOpacity
              style={[styles.docTypeBtn, documentType === 'cpf' && styles.docTypeBtnActive]}
              onPress={() => setDocumentType('cpf')}
            >
              <Text style={[styles.docTypeText, documentType === 'cpf' && styles.docTypeTextActive]}>CPF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.docTypeBtn, documentType === 'cnpj' && styles.docTypeBtnActive]}
              onPress={() => setDocumentType('cnpj')}
            >
              <Text style={[styles.docTypeText, documentType === 'cnpj' && styles.docTypeTextActive]}>CNPJ</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{documentType === 'cpf' ? 'CPF' : 'CNPJ'}</Text>
          <TextInput
            style={styles.input}
            placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
            value={documentValue}
            onChangeText={handleDocumentChange}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Nome do Restaurante</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Espetinho do Zé"
            value={restaurantName}
            onChangeText={setRestaurantName}
          />

          <Text style={styles.label}>Seu Nome (Administrador)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: José Silva"
            value={adminName}
            onChangeText={setAdminName}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
              <Ionicons name={secureText ? "eye-off" : "eye"} size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Repita a senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={secureText}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>CRIAR CONTA GRÁTIS</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  backBtn: {
    marginBottom: 20,
    marginTop: 10,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  inputPassword: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  docTypeContainer: {
    flexDirection: 'row',
    marginBottom: 5,
    marginTop: 5,
  },
  docTypeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  docTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  docTypeText: {
    color: '#666',
    fontWeight: '600'
  },
  docTypeTextActive: {
    color: '#FFF'
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
