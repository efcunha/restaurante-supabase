import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const valueCards = [
  {
    title: 'Operacao mais clara',
    description: 'Fluxos organizados para facilitar a leitura de pedidos, caixa, atendimento e administracao.',
    icon: 'receipt-outline',
  },
  {
    title: 'Experiencia web moderna',
    description: 'Interface pensada para escritorio com melhor contraste, hierarquia visual e navegacao objetiva.',
    icon: 'desktop-outline',
  },
  {
    title: 'Base pronta para evolucao',
    description: 'Estrutura preparada para novas melhorias sem perder estabilidade nem produtividade no uso diario.',
    icon: 'rocket-outline',
  },
];

const focusAreas = [
  'Apoio ao atendimento e ao fluxo operacional do restaurante.',
  'Leitura visual mais limpa para reduzir esforco e melhorar entendimento.',
  'Estrutura preparada para crescimento da plataforma com consistencia.',
];

export default function AboutScreen({ navigation }: Props) {
  const windowWidth = Dimensions.get('window').width;
  const isDesktop = windowWidth >= 1080;

  return (
    <View style={styles.container}>
      <View style={[styles.backdropOrb, styles.backdropOrbTop]} />
      <View style={[styles.backdropOrb, styles.backdropOrbBottom]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.backButtonText}>Voltar ao login</Text>
        </TouchableOpacity>

        <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
          <View style={[styles.heroCard, isDesktop && styles.heroCardMain]}>
            <Text style={styles.kicker}>Sobre a plataforma</Text>
            <Text style={styles.title}>Machado & Cunha Soft House</Text>
            <Text style={styles.subtitle}>
              Solucoes web para operacao, atendimento e gestao de restaurantes com foco em clareza visual, produtividade e confiabilidade.
            </Text>
          </View>

          <View style={[styles.heroCard, styles.heroCardSide, isDesktop && styles.heroCardSideDesktop]}>
            <Text style={styles.sideEyebrow}>Desenvolvimento</Text>
            <Text style={styles.sideHeadline}>Experiencia desenhada para uso real na rotina do restaurante.</Text>
            <Text style={styles.sideBody}>
              Este aplicativo web foi desenvolvido para apoiar controle operacional e administrativo com uma interface mais elegante, objetiva e facil de entender no uso diario.
            </Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>O que esta plataforma entrega</Text>
          <View style={[styles.valueGrid, isDesktop && styles.valueGridDesktop]}>
            {valueCards.map((item, index) => (
              <View key={item.title} style={[styles.valueCard, isDesktop && styles.valueCardDesktop, isDesktop && index === valueCards.length - 1 && styles.valueCardDesktopLast]}>
                <View style={styles.valueIconBadge}>
                  <Ionicons name={item.icon as any} size={18} color="#173243" />
                </View>
                <Text style={styles.valueTitle}>{item.title}</Text>
                <Text style={styles.valueDescription}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.focusPanel, isDesktop && styles.focusPanelDesktop]}>
          <View style={[styles.focusIntroCard, isDesktop && styles.focusIntroCardDesktop]}>
            <Text style={styles.focusKicker}>Direcao do produto</Text>
            <Text style={styles.focusTitle}>Uma plataforma desenhada para produtividade, leitura e continuidade.</Text>
          </View>

          <View style={[styles.focusListCard, isDesktop && styles.focusListCardDesktop]}>
            {focusAreas.map((item) => (
              <View key={item} style={styles.focusItemRow}>
                <View style={styles.focusItemDot} />
                <Text style={styles.focusItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.institutionalPanel, isDesktop && styles.institutionalPanelDesktop]}>
          <View style={styles.institutionalCopy}>
            <Text style={styles.sectionHeading}>Informacoes institucionais</Text>
            <Text style={styles.institutionalName}>Machado & Cunha Soft House</Text>
            <Text style={styles.institutionalText}>
              Desenvolvimento orientado a operacao, usabilidade e evolucao continua de plataformas para restaurantes.
            </Text>
          </View>

          <View style={styles.rightsCard}>
            <Text style={styles.rightsLabel}>Direitos</Text>
            <Text style={styles.rightsValue}>Todos os direitos reservados.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C7A96',
    overflow: 'hidden',
  },
  backdropOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.28,
  },
  backdropOrbTop: {
    width: 360,
    height: 360,
    backgroundColor: '#F1B24B',
    top: -120,
    left: -90,
  },
  backdropOrbBottom: {
    width: 460,
    height: 460,
    backgroundColor: '#073A49',
    bottom: -180,
    right: -130,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 42,
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 22,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  heroSection: {
    width: '100%',
  },
  heroSectionDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroCard: {
    backgroundColor: 'rgba(255,252,247,0.98)',
    borderRadius: 30,
    padding: 28,
    marginBottom: 18,
    // @ts-ignore
    boxShadow: '0px 20px 40px rgba(4, 38, 47, 0.24)',
    elevation: 12,
  },
  heroCardMain: {
    flex: 1.2,
    marginRight: 18,
  },
  heroCardSide: {
    backgroundColor: '#173243',
  },
  heroCardSideDesktop: {
    flex: 0.85,
  },
  kicker: {
    color: '#0B6780',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  title: {
    color: '#12202C',
    fontSize: 42,
    lineHeight: 49,
    fontWeight: '900',
  },
  subtitle: {
    color: '#566776',
    fontSize: 18,
    lineHeight: 29,
    marginTop: 16,
    maxWidth: 720,
  },
  sideEyebrow: {
    color: '#F7C45C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sideHeadline: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
  },
  sideBody: {
    color: '#D7F0F5',
    fontSize: 16,
    lineHeight: 26,
    marginTop: 14,
  },
  sectionBlock: {
    marginTop: 6,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '900',
    marginBottom: 18,
  },
  valueGrid: {
    width: '100%',
  },
  valueGridDesktop: {
    flexDirection: 'row',
  },
  valueCard: {
    backgroundColor: 'rgba(250,253,255,0.97)',
    borderRadius: 26,
    padding: 22,
    minHeight: 220,
    marginBottom: 16,
  },
  valueCardDesktop: {
    flex: 1,
    marginRight: 16,
  },
  valueCardDesktopLast: {
    marginRight: 0,
  },
  valueIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5C35A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  valueTitle: {
    color: '#13212E',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  valueDescription: {
    color: '#526372',
    fontSize: 16,
    lineHeight: 26,
    marginTop: 12,
  },
  focusPanel: {
    marginTop: 4,
    marginBottom: 18,
  },
  focusPanelDesktop: {
    flexDirection: 'row',
  },
  focusIntroCard: {
    backgroundColor: '#173243',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
  },
  focusIntroCardDesktop: {
    flex: 0.95,
    marginRight: 16,
    marginBottom: 0,
  },
  focusListCard: {
    backgroundColor: 'rgba(255,252,247,0.98)',
    borderRadius: 28,
    padding: 24,
  },
  focusListCardDesktop: {
    flex: 1.05,
  },
  focusKicker: {
    color: '#F7C45C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  focusTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
  },
  focusItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  focusItemDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#0B6780',
    marginTop: 8,
    marginRight: 12,
  },
  focusItemText: {
    flex: 1,
    color: '#22323F',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '700',
  },
  institutionalPanel: {
    marginTop: 8,
    backgroundColor: 'rgba(5,51,64,0.42)',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  institutionalPanelDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  institutionalCopy: {
    flex: 1,
    marginBottom: 16,
  },
  institutionalName: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  institutionalText: {
    color: '#D7EFF4',
    fontSize: 16,
    lineHeight: 26,
    marginTop: 12,
    maxWidth: 760,
  },
  rightsCard: {
    minWidth: 280,
    backgroundColor: '#F5C35A',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
  },
  rightsLabel: {
    color: '#173243',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rightsValue: {
    color: '#173243',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 8,
  },
});