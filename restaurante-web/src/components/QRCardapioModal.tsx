/**
 * QRCardapioModal - Painel de configuração e publicação do Cardápio Digital QR
 *
 * Permite ao admin:
 * 1. Configurar/personalizar o slug público da empresa
 * 2. Ativar/desativar a publicação do cardápio
 * 3. Visualizar e copiar o link público
 * 4. Baixar/compartilhar o QR code
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../config/SupabaseConfig';
import { colors } from '../theme/colors';

const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://restaurante-web.app.br'
    : 'http://localhost:8081');

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface Props {
  visible: boolean;
  onClose: () => void;
  companyId?: string;
}

interface CompanyMenuData {
  id: string;
  name: string;
  public_slug: string | null;
  menu_published: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function QRCardapioModal({ visible, onClose, companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyMenuData | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [published, setPublished] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [slugError, setSlugError] = useState('');
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<any>(null);

  const menuUrl = company?.public_slug
    ? `${WEB_BASE_URL}/menu/${company.public_slug}`
    : null;

  const loadCompany = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      Alert.alert('Erro', 'ID da empresa não encontrado. Tente relogar.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, public_slug, menu_published')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompany(data);
      setSlugInput(data.public_slug || '');
      setPublished(data.menu_published || false);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do cardápio.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (visible && companyId) {
      loadCompany();
      setSaveState('idle');
      setSlugError('');
      setCopied(false);
    } else if (visible && !companyId) {
      loadCompany(); // will set loading=false and show alert
    }
  }, [visible, companyId, loadCompany]);

  const validateSlug = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return 'O slug não pode ser vazio.';
    if (trimmed.length < 3) return 'Mínimo de 3 caracteres.';
    if (trimmed.length > 60) return 'Máximo de 60 caracteres.';
    if (!SLUG_REGEX.test(trimmed))
      return 'Use apenas letras minúsculas, números e hífens (sem espaços ou caracteres especiais).';
    return '';
  };

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInput(sanitized);
    if (saveState === 'error') setSaveState('idle');
    setSlugError('');
  };

  const checkSlugUnique = async (slug: string): Promise<boolean> => {
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('public_slug', slug)
      .neq('id', companyId || '')
      .maybeSingle();
    return data === null;
  };

  const handleSave = async () => {
    const error = validateSlug(slugInput);
    if (error) {
      setSlugError(error);
      return;
    }

    setSaveState('saving');
    setSlugError('');

    try {
      const isUnique = await checkSlugUnique(slugInput.trim());
      if (!isUnique) {
        setSlugError('Este slug já está sendo usado por outra empresa. Escolha outro.');
        setSaveState('error');
        return;
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          public_slug: slugInput.trim(),
          menu_published: published,
        })
        .eq('id', companyId || '');

      if (updateError) throw updateError;

      setCompany((prev) =>
        prev
          ? { ...prev, public_slug: slugInput.trim(), menu_published: published }
          : prev,
      );
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err: any) {
      setSaveState('error');
      Alert.alert('Erro', err.message || 'Falha ao salvar configurações.');
    }
  };

  const handleTogglePublished = async (value: boolean) => {
    setPublished(value);
    if (!company?.public_slug) return; // Não salva automaticamente sem slug

    try {
      await supabase
        .from('companies')
        .update({ menu_published: value })
        .eq('id', companyId || '');
      setCompany((prev) => (prev ? { ...prev, menu_published: value } : prev));
    } catch {
      setPublished(!value); // Reverte em caso de erro
      Alert.alert('Erro', 'Não foi possível alterar o status de publicação.');
    }
  };

  const handleCopyLink = async () => {
    if (!menuUrl) return;
    await Clipboard.setStringAsync(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!menuUrl) return;
    try {
      await Share.share({
        message: `Confira o cardápio de ${company?.name}: ${menuUrl}`,
        url: menuUrl,
      });
    } catch {
      // Usuário cancelou ou plataforma não suporta
    }
  };

  const generateSuggestedSlug = () => {
    if (!company?.name) return;
    const suggested = company.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 50);
    setSlugInput(suggested);
    setSlugError('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cardápio Digital (QR)</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando configurações…</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Status badge */}
            <View
              style={[
                styles.statusBadge,
                published && company?.public_slug
                  ? styles.statusBadgeOn
                  : styles.statusBadgeOff,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  published && company?.public_slug
                    ? styles.statusDotOn
                    : styles.statusDotOff,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  published && company?.public_slug
                    ? styles.statusTextOn
                    : styles.statusTextOff,
                ]}
              >
                {published && company?.public_slug
                  ? 'Cardápio publicado e acessível ao público'
                  : 'Cardápio não publicado'}
              </Text>
            </View>

            {/* ─── Slug ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Endereço do Cardápio</Text>
              <Text style={styles.sectionDesc}>
                O slug aparece na URL pública. Use apenas letras minúsculas, números e hífens.
              </Text>

              <View style={styles.slugRow}>
                <Text style={styles.slugPrefix}>{WEB_BASE_URL}/menu/</Text>
                <TextInput
                  style={[styles.slugInput, slugError ? styles.inputError : null]}
                  value={slugInput}
                  onChangeText={handleSlugChange}
                  placeholder="meu-restaurante"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={60}
                />
              </View>

              {slugError ? (
                <Text style={styles.errorText}>
                  <Ionicons name="alert-circle-outline" size={13} /> {slugError}
                </Text>
              ) : null}

              {!slugInput && company?.name ? (
                <TouchableOpacity onPress={generateSuggestedSlug} style={styles.suggestionBtn}>
                  <Ionicons name="bulb-outline" size={14} color={colors.primary} />
                  <Text style={styles.suggestionText}>
                    Sugerir baseado no nome: "{company.name}"
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ─── Publicação ─── */}
            <View style={styles.section}>
              <View style={styles.publishRow}>
                <View style={styles.publishLabel}>
                  <Text style={styles.sectionTitle}>Publicar Cardápio</Text>
                  <Text style={styles.sectionDesc}>
                    Quando ativado, qualquer pessoa com o link poderá ver o cardápio.
                  </Text>
                </View>
                <Switch
                  value={published}
                  onValueChange={handleTogglePublished}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={Platform.OS === 'android' ? colors.white : undefined}
                  disabled={!company?.public_slug}
                />
              </View>
              {!company?.public_slug && (
                <Text style={styles.hintText}>
                  <Ionicons name="information-circle-outline" size={13} /> Salve um slug antes de publicar.
                </Text>
              )}
            </View>

            {/* ─── Salvar ─── */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                saveState === 'saving' && styles.saveBtnDisabled,
                saveState === 'saved' && styles.saveBtnSaved,
              ]}
              onPress={handleSave}
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : saveState === 'saved' ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                  <Text style={styles.saveBtnText}>Salvo!</Text>
                </>
              ) : (
                <Text style={styles.saveBtnText}>Salvar Configurações</Text>
              )}
            </TouchableOpacity>

            {/* ─── QR Code ─── */}
            {menuUrl ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>QR Code do Cardápio</Text>
                <Text style={styles.sectionDesc}>
                  Imprima ou compartilhe este QR code nas mesas, fachada ou embalagens.
                </Text>

                <View style={styles.qrWrapper}>
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={menuUrl}
                      size={200}
                      color="#1a1a1a"
                      backgroundColor="#ffffff"
                      getRef={(ref) => { qrRef.current = ref; }}
                      enableLinearGradient={false}
                    />
                  </View>
                  <Text style={styles.qrRestaurantName}>{company?.name}</Text>
                  <Text style={styles.qrSubLabel}>Escaneie para ver o cardápio</Text>
                </View>

                {/* Link + ações */}
                <View style={styles.linkBox}>
                  <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                    {menuUrl}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, copied && styles.actionBtnCopied]}
                    onPress={handleCopyLink}
                  >
                    <Ionicons
                      name={copied ? 'checkmark-done-outline' : 'copy-outline'}
                      size={18}
                      color={copied ? colors.success : colors.primary}
                    />
                    <Text
                      style={[styles.actionBtnText, copied && styles.actionBtnTextCopied]}
                    >
                      {copied ? 'Copiado!' : 'Copiar link'}
                    </Text>
                  </TouchableOpacity>

                  {Platform.OS !== 'web' && (
                    <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                      <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                      <Text style={styles.actionBtnText}>Compartilhar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={64} color={colors.border} />
                <Text style={styles.qrPlaceholderText}>
                  Salve um slug para gerar o QR code.
                </Text>
              </View>
            )}

            {/* ─── Preview link ─── */}
            {menuUrl && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Testar Cardápio</Text>
                <Text style={styles.sectionDesc}>
                  Escaneie o QR code ou acesse o link no navegador para ver como o cardápio
                  aparece para os clientes.
                </Text>
                <View style={styles.previewNote}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                  <Text style={styles.previewNoteText}>
                    O cardápio só fica visível ao público quando "Publicar Cardápio" está
                    ativado.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  statusBadgeOn: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeOff: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOn: {
    backgroundColor: '#10B981',
  },
  statusDotOff: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusTextOn: {
    color: '#065F46',
  },
  statusTextOff: {
    color: '#6B7280',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  slugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  slugPrefix: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    flexShrink: 0,
  },
  slugInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  publishLabel: {
    flex: 1,
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnSaved: {
    backgroundColor: colors.success,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  qrWrapper: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  qrRestaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  qrSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  actionBtnCopied: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionBtnTextCopied: {
    color: colors.success,
  },
  qrPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    opacity: 0.5,
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  previewNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  previewNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
});
