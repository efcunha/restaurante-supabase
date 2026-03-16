import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const highlights = [
  'Organiza pedidos, comandas, caixa e operacao diaria do restaurante.',
  'Entrega uma experiencia mobile focada em rapidez, leitura clara e fluxo direto.',
  'Apoia evolucao continua da operacao com base confiavel para novas funcionalidades.',
];

export default function AboutScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.backButtonText}>Voltar ao login</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Sobre</Text>
          <Text style={styles.title}>Machado & Cunha Soft House</Text>
          <Text style={styles.subtitle}>
            Tecnologia mobile para apoiar atendimento, operacao e gestao do restaurante.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quem desenvolveu este aplicativo</Text>
          <Text style={styles.bodyText}>
            Este aplicativo foi desenvolvido pela Machado & Cunha Soft House para oferecer uma experiencia pratica e objetiva no dia a dia do restaurante, com foco em operacao, controle e produtividade.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Principais objetivos</Text>
          {highlights.map((item) => (
            <View key={item} style={styles.highlightRow}>
              <View style={styles.highlightDot} />
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informacoes institucionais</Text>
          <Text style={styles.bodyText}>Machado & Cunha Soft House</Text>
          <Text style={styles.rightsText}>Todos os direitos reservados.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginBottom: 16,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    elevation: 8,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    marginBottom: 10,
  },
  bodyText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  highlightText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  rightsText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});