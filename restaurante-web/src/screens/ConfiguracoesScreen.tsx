/**
 * ConfiguracoesScreen - Team + Profile Management
 * Phase 6 Admin - Pattern: FormSection + FieldRow + DataListItem + StateView + Logger
 *
 * Features:
 * - Team member management (add/remove users)
 * - Profile settings (name, email, phone)
 * - Notification preferences
 * - Security (change password, logout)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/SupabaseConfig';
import { StateView, FormSection, FieldRow, DataListItem, ConfirmActionDialog } from '../ui';
import { designColors, fontSizes, fontWeights, spacing } from '../design-system';
import LoggerService from '../services/LoggerService';

// Types
interface TeamMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_access?: string;
}

type LoadState = 'loading' | 'empty' | 'error' | 'success';

interface ConfiguracoesScreenProps {
  onClose?: () => void;
}

const DEBOUNCE_MS = 300;

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function ConfiguracoesScreen({ onClose }: ConfiguracoesScreenProps) {
  const { user, logout } = useAuth();
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Team management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Profile form
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Notifications
  const [notifOrderUpdates, setNotifOrderUpdates] = useState(true);
  const [notifFinancial, setNotifFinancial] = useState(true);
  const [notifTeam, setNotifTeam] = useState(true);

  // Dialog state
  const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      if (!user?.id || !user?.companyId) {
        setErrorMsg('Usuário ou empresa não identificada.');
        setState('error');
        return;
      }

      setState('loading');
      setErrorMsg(null);

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setProfileName(profileData.full_name || '');
        setProfilePhone(profileData.phone || '');
      }

      // Load team members
      const { data: teamData, error: teamError } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (teamError) throw teamError;

      setTeamMembers((teamData as TeamMember[]) || []);

      LoggerService.logInfo('Configurações carregadas com sucesso', 'ConfiguracoesScreen#loadSettings', {
        teamSize: (teamData || []).length,
      });

      setState(teamData && teamData.length > 0 ? 'success' : 'empty');
    } catch (err) {
      const error = err as Error;
      LoggerService.logError(error, 'ConfiguracoesScreen#loadSettings');
      setErrorMsg(error.message || 'Erro ao carregar configurações');
      setState('error');
    }
  };

  // Save profile changes (debounced)
  const debouncedSaveProfile = useMemo(
    () =>
      async (name: string, phone: string) => {
        if (!user?.id) return;

        try {
          setSavingProfile(true);
          const { error } = await supabase
            .from('profiles')
            .update({ full_name: name, phone })
            .eq('id', user.id);

          if (error) throw error;

          LoggerService.logInfo('Perfil atualizado', 'ConfiguracoesScreen#saveProfile', {
            nameChanged: name !== user.email,
            phoneChanged: !!phone,
          });
        } catch (err) {
          const error = err as Error;
          LoggerService.logError(error, 'ConfiguracoesScreen#saveProfile');
          Alert.alert('Erro', 'Não foi possível salvar o perfil');
        } finally {
          setSavingProfile(false);
        }
      },
    [user?.id]
  );

  const handleProfileChange = useCallback(
    (name: string, phone: string) => {
      setProfileName(name);
      setProfilePhone(phone);
    },
    []
  );

  // Add team member
  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      Alert.alert('Validação', 'Insira um email válido');
      return;
    }

    try {
      setAddingMember(true);

      // Call edge function to add user
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/add-team-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabase.auth.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          email: newMemberEmail,
          companyId: user?.companyId,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      LoggerService.logInfo('Membro adicionado à equipe', 'ConfiguracoesScreen#addMember', {
        email: newMemberEmail.split('@')[0] + '@***.***', // Partial masking
      });

      setNewMemberEmail('');
      await loadSettings();
    } catch (err) {
      const error = err as Error;
      LoggerService.logError(error, 'ConfiguracoesScreen#addMember', { email: newMemberEmail });
      Alert.alert('Erro', 'Não foi possível adicionar o membro');
    } finally {
      setAddingMember(false);
    }
  };

  // Remove team member
  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId)
        .eq('company_id', user?.companyId);

      if (error) throw error;

      LoggerService.logInfo('Membro removido da equipe', 'ConfiguracoesScreen#removeMember', {
        memberId,
      });

      setShowConfirmRemove(null);
      await loadSettings();
    } catch (err) {
      const error = err as Error;
      LoggerService.logError(error, 'ConfiguracoesScreen#removeMember');
      Alert.alert('Erro', 'Não foi possível remover o membro');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            LoggerService.logInfo('Usuário realizou logout', 'ConfiguracoesScreen#logout', {
              userId: user?.id,
            });

            await logout();
          } catch (err) {
            const error = err as Error;
            LoggerService.logError(error, 'ConfiguracoesScreen#logout');
          }
        },
      },
    ]);
  };

  const roleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      gerente: 'Gerente',
      garcom: 'Garçom',
      cozinheiro: 'Cozinheiro',
      caixa: 'Caixa',
      entregador: 'Entregador',
    };
    return roles[role] || role;
  };

  return (
    <ScreenScaffold
      header={{ title: 'Configurações', subtitle: 'Gerencie seu perfil e equipe' }}
      onClose={onClose}
    >
      <StateView
        state={state}
        onRetry={loadSettings}
        errorMessage={errorMsg}
        loadingComponent={<ActivityIndicator size="large" color={designColors.semantic.info.default} />}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <FormSection
            title="Meu Perfil"
            description="Atualize seus dados pessoais"
          >
            <FieldRow label="Email" helper={user?.email}>
              <Text style={styles.staticValue}>{user?.email}</Text>
            </FieldRow>

            <FieldRow label="Nome Completo" required>
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                value={profileName}
                onChangeText={handleProfileChange}
                editable={!savingProfile}
                placeholderTextColor={designColors.text.secondary}
              />
            </FieldRow>

            <FieldRow label="Telefone">
              <TextInput
                style={styles.input}
                placeholder="+55 (11) 99999-9999"
                value={profilePhone}
                onChangeText={(phone) => handleProfileChange(profileName, phone)}
                editable={!savingProfile}
                placeholderTextColor={designColors.text.secondary}
                keyboardType="phone-pad"
              />
            </FieldRow>

            {savingProfile && (
              <ActivityIndicator size="small" color={designColors.semantic.info.default} />
            )}
          </FormSection>

          {/* Notifications Section */}
          <FormSection
            title="Notificações"
            description="Escolha como deseja ser notificado"
          >
            <FieldRow label="Atualizações de Pedidos">
              <Switch
                value={notifOrderUpdates}
                onValueChange={setNotifOrderUpdates}
                trackColor={{
                  false: designColors.border.default,
                  true: designColors.semantic.success.default,
                }}
                thumbColor="white"
              />
            </FieldRow>

            <FieldRow label="Alertas Financeiros">
              <Switch
                value={notifFinancial}
                onValueChange={setNotifFinancial}
                trackColor={{
                  false: designColors.border.default,
                  true: designColors.semantic.success.default,
                }}
                thumbColor="white"
              />
            </FieldRow>

            <FieldRow label="Mensagens da Equipe">
              <Switch
                value={notifTeam}
                onValueChange={setNotifTeam}
                trackColor={{
                  false: designColors.border.default,
                  true: designColors.semantic.success.default,
                }}
                thumbColor="white"
              />
            </FieldRow>
          </FormSection>

          {/* Team Management Section */}
          <FormSection
            title={`Equipe (${teamMembers.length})`}
            description="Gerencie os membros da sua equipe"
          >
            {/* Add new member */}
            <View style={styles.addMemberRow}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                placeholder="Email do novo membro"
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
                editable={!addingMember}
                placeholderTextColor={designColors.text.secondary}
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  addingMember && styles.addButtonDisabled,
                ]}
                onPress={handleAddMember}
                disabled={addingMember}
                accessibilityLabel="Adicionar membro"
              >
                {addingMember ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="add" size={24} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* Team members list */}
            {teamMembers.length > 0 ? (
              <View style={styles.membersList}>
                {teamMembers.map((member) => (
                  <DataListItem
                    key={member.id}
                    title={member.email}
                    subtitle={roleLabel(member.role)}
                    meta={`Desde ${new Date(member.created_at).toLocaleDateString('pt-BR')}`}
                    status={member.id === user?.id ? 'success' : 'default'}
                    onPress={
                      member.id !== user?.id
                        ? () => setShowConfirmRemove(member.id)
                        : undefined
                    }
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Nenhum membro na equipe</Text>
            )}
          </FormSection>

          {/* Security Section */}
          <FormSection
            title="Segurança"
            description="Gerencie suas credenciais"
          >
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              accessibilityLabel="Fazer logout"
            >
              <Ionicons name="log-out" size={20} color={designColors.semantic.error.default} />
              <Text style={styles.logoutButtonText}>Fazer Logout</Text>
            </TouchableOpacity>
          </FormSection>

          {/* Spacer */}
          <View style={{ height: spacing[4] }} />
        </ScrollView>
      </StateView>

      {/* Confirm Remove Dialog */}
      <ConfirmActionDialog
        visible={!!showConfirmRemove}
        title="Remover Membro"
        message="Tem certeza que deseja remover este membro da equipe?"
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={() => {
          if (showConfirmRemove) {
            handleRemoveMember(showConfirmRemove);
          }
        }}
        onCancel={() => setShowConfirmRemove(null)}
        isDangerous
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing[4],
    gap: spacing[4],
  },
  staticValue: {
    color: designColors.text.secondary,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
  },
  input: {
    borderWidth: 1,
    borderColor: designColors.border.default,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: fontSizes.base,
    color: designColors.text.primary,
    backgroundColor: designColors.surface.input,
  },
  addMemberRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: designColors.semantic.success.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  membersList: {
    gap: spacing[2],
  },
  emptyText: {
    color: designColors.text.secondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    textAlign: 'center',
    paddingVertical: spacing[3],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: 8,
    backgroundColor: designColors.semantic.error.tint,
  },
  logoutButtonText: {
    color: designColors.semantic.error.default,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
});
