/**
 * Serviço de Funcionários
 * Gerencia cadastro e consulta de funcionários usando Supabase
 */

import { supabase } from '../config/SupabaseConfig';
import { Funcionario } from '../types';

// Flag para ignorar mudanças de auth durante cadastro (mantido para compatibilidade)
let ignorandoMudancaAuth = false;

export const setIgnorarMudancaAuth = (valor: boolean) => {
  ignorandoMudancaAuth = valor;
};

export const isIgnorandoMudancaAuth = () => ignorandoMudancaAuth;

interface CreateFuncionarioData {
  nome: string;
  cpf: string;
  funcao: string;
  email: string;
  senha?: string;
  companyId?: string;
  phone?: string;
}

function toErrorMessage(error: unknown, fallback: string): string {
  // FunctionsHttpError is an Error subclass with .message already populated
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
}

async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (typeof error === 'object' && error !== null && 'context' in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      // Use clone() so reading the body doesn't consume the original
      const body = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (body?.error) {
        return body.error;
      }
    }
  }

  // FunctionsHttpError.message is already the parsed error string from the response body
  return toErrorMessage(error, fallback);
}

async function invokeCreateEmployeeFunction(dados: CreateFuncionarioData) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const { data, error } = await supabase.functions.invoke('create-company-employee', {
    body: dados,
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  if (error) {
    throw new Error(
      await extractFunctionErrorMessage(error, 'Não foi possível criar o funcionário.')
    );
  }

  return data as {
    success: boolean;
    funcionarioId: string;
    funcionario: Funcionario;
  };
}

/**
 * Cria um novo funcionário no Supabase Auth e profiles
 * @param {Object} dados - {nome, cpf, funcao, email, senha, companyId, phone}
 * @returns {Promise<Object>} {success, funcionarioId, error}
 */
export const criarFuncionario = async (dados: CreateFuncionarioData) => {
  try {
    setIgnorarMudancaAuth(true);

    if (!dados.senha) {
      throw new Error("Senha é obrigatória para criar funcionário.");
    }

    if (!dados.companyId) {
      throw new Error("Company ID é obrigatório para criar funcionário.");
    }

    const result = await invokeCreateEmployeeFunction(dados);

    setIgnorarMudancaAuth(false);

    return {
      success: true,
      funcionarioId: result.funcionarioId,
      funcionario: result.funcionario
    };
  } catch (error: any) {
    setIgnorarMudancaAuth(false);

    let errorMessage = 'Erro: ' + error.message;

    // Mapear erros do Supabase
    if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
      errorMessage = 'Email já cadastrado';
    } else if (error.message?.includes('rate limit exceeded')) {
      errorMessage = 'Limite de tentativas de cadastro/email excedido no Supabase. Aguarde alguns minutos antes de tentar novamente.';
    } else if (error.message?.includes('Password')) {
      errorMessage = 'Senha muito fraca (mínimo 6 caracteres)';
    } else if (error.message?.includes('invalid format') || error.message?.includes('invalid email')) {
      errorMessage = 'Email inválido (formato incorreto)';
    }
    // Nota: outros erros relacionados a email, como domínio bloqueado, mostram a mensagem real do Supabase.

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Lista todos os funcionários ativos da empresa do usuário logado
 * @returns {Promise<Object>} {success, funcionarios, error}
 */
export const listarFuncionarios = async (companyId?: string) => {
  try {
    let targetCompanyId = companyId;

    // Only fetch company_id if not provided
    if (!targetCompanyId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!currentProfile?.company_id) throw new Error('Usuário sem empresa vinculada');
      targetCompanyId = currentProfile.company_id;
    }

    // Buscar todos os funcionários da mesma empresa
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', targetCompanyId)
      .order('full_name', { ascending: true });

    if (error) throw error;

    // Mapear para formato Funcionario
    const funcionarios: Funcionario[] = (data || []).map(profile => ({
      id: profile.id,
      uid: profile.id,
      nome: profile.full_name || '',
      cpf: profile.cpf || '',
      phone: profile.phone || '',
      funcao: profile.role || profile.funcao || 'garcom',
      email: profile.email || '',
      companyId: profile.company_id,
      ativo: profile.active !== false,
      criadoEm: profile.created_at,
    }));

    return { success: true, funcionarios };
  } catch (error: any) {
    console.error('[FuncionariosService] Erro ao listar:', error);
    return { success: false, error: error.message, funcionarios: [] };
  }
};


/**
 * Lista funcionários por função
 * @param {string} funcao - garcom, churrasqueiro, montagem, admin
 * @returns {Promise<Object>} {success, funcionarios}
 */
export const listarFuncionariosPorFuncao = async (funcao: string) => {
  try {
    // Buscar company_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!currentProfile?.company_id) throw new Error('Usuário sem empresa vinculada');

    // Buscar funcionários da mesma empresa com a função especificada
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', currentProfile.company_id)
      .eq('role', funcao)
      .eq('active', true)
      .order('full_name', { ascending: true });

    if (error) throw error;

    // Mapear para formato Funcionario
    const funcionarios: Funcionario[] = (data || []).map(profile => ({
      id: profile.id,
      uid: profile.id,
      nome: profile.full_name || '',
      cpf: profile.cpf || '',
      phone: profile.phone || '',
      funcao: profile.role || profile.funcao || 'garcom',
      email: profile.email || '',
      companyId: profile.company_id,
      ativo: profile.active !== false,
      criadoEm: profile.created_at,
    }));

    return { success: true, funcionarios };
  } catch (error: any) {
    console.error('[FuncionariosService] Erro ao listar por função:', error);
    return { success: false, error: error.message, funcionarios: [] };
  }
};

/**
 * Busca funcionário por UID do Supabase Auth
 * @param {string} uid - UID do usuário autenticado
 * @returns {Promise<Object>} {success, funcionario}
 */
export const buscarFuncionarioPorUid = async (uid: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Funcionário não encontrado' };
      }
      throw error;
    }

    if (!data) {
      return { success: false, error: 'Funcionário não encontrado' };
    }

    const funcionario: Funcionario = {
      id: data.id,
      uid: data.id,
      nome: data.full_name || '',
      cpf: data.cpf || '',
      phone: data.phone || '',
      funcao: data.role || data.funcao || 'garcom',
      email: data.email || '',
      companyId: data.company_id,
      ativo: data.active !== false,
      criadoEm: data.created_at,
    };

    return { success: true, funcionario };
  } catch (error: any) {
    console.error('[FuncionariosService] Erro ao buscar por UID:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Deleta permanentemente um funcionário do Supabase
 * Nota: Requer permissões de admin para deletar usuário do Auth
 * @param {string} funcionarioId - ID do funcionário (UID)
 * @returns {Promise<Object>} {success, error}
 */
export const deletarFuncionario = async (funcionarioId: string) => {
  try {
    // 1. Verificar se o funcionário existe
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', funcionarioId)
      .single();

    if (fetchError || !profile) {
      return { success: false, error: 'Funcionário não encontrado' };
    }

    // 2. Deletar profile (cascade delete via RLS)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', funcionarioId);

    if (deleteError) throw deleteError;

    // 3. Tentar deletar do Auth (requer service_role key)
    // Nota: Isso só funciona se estiver usando service_role key
    // Com anon key, apenas desativa o profile
    try {
      await supabase.auth.admin.deleteUser(funcionarioId);
    } catch (authError) {
      console.warn('[FuncionariosService] Não foi possível deletar do Auth:', authError);
    }

    return {
      success: true,
      warning: 'Funcionário removido do sistema.'
    };
  } catch (error: any) {
    console.error('[FuncionariosService] Erro ao deletar:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Desativa um funcionário (soft delete)
 * @param {string} funcionarioId - ID do funcionário
 * @returns {Promise<Object>} {success, error}
 */
export const desativarFuncionario = async (funcionarioId: string) => {
  try {
    console.log('[Funcionarios] 🗑️ Desativando funcionário ID:', funcionarioId);

    // Verificar se o funcionário existe
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', funcionarioId)
      .single();

    if (fetchError || !profile) {
      console.error('[Funcionarios] ❌ Funcionário não encontrado:', funcionarioId);
      return { success: false, error: 'Funcionário não encontrado' };
    }

    console.log('[Funcionarios] 📋 Dados atuais:', profile);
    console.log('[Funcionarios] 🔄 Atualizando active = false...');

    // Desativar funcionário
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', funcionarioId);

    if (updateError) throw updateError;

    console.log('[Funcionarios] ✅ Funcionário desativado com sucesso!');
    return { success: true };
  } catch (error: any) {
    console.error('[Funcionarios] ❌ Erro ao desativar:', error);
    console.error('[Funcionarios] ❌ Mensagem:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Atualiza dados de um funcionário
 * @param {string} funcionarioId - ID do funcionário (UID do Supabase Auth)
 * @param {Object} dadosAtualizados - Campos a atualizar {nome, cpf, email, senha, funcao}
 * @returns {Promise<Object>} {success, error}
 */
export const atualizarFuncionario = async (
  funcionarioId: string,
  dadosAtualizados: Partial<CreateFuncionarioData> & { ativo?: boolean }
) => {
  try {
    console.log('[Funcionarios] ✏️ Atualizando funcionário ID:', funcionarioId);
    console.log('[Funcionarios] 📋 Dados para atualizar:', {
      ...dadosAtualizados,
      senha: dadosAtualizados.senha ? '***' : undefined
    });

    // Verificar se existe
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', funcionarioId)
      .single();

    if (fetchError || !profile) {
      console.error('[Funcionarios] ❌ Funcionário não encontrado:', funcionarioId);
      return { success: false, error: 'Funcionário não encontrado' };
    }

    // Preparar dados para atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (dadosAtualizados.nome) {
      updateData.full_name = dadosAtualizados.nome.trim();
    }
    if (dadosAtualizados.cpf) {
      updateData.cpf = dadosAtualizados.cpf.trim();
    }
    if (dadosAtualizados.funcao) {
      updateData.role = dadosAtualizados.funcao;
      updateData.funcao = dadosAtualizados.funcao; // Legacy field
    }
    if (dadosAtualizados.phone !== undefined) {
      updateData.phone = dadosAtualizados.phone;
    }
    if (dadosAtualizados.ativo !== undefined) {
      updateData.active = dadosAtualizados.ativo;
    }
    if (dadosAtualizados.email && dadosAtualizados.email !== profile.email) {
      updateData.email = dadosAtualizados.email.toLowerCase().trim();
    }

    console.log('[Funcionarios] 🔄 Dados finais para update:', updateData);

    // Atualizar profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', funcionarioId);

    if (updateError) throw updateError;

    console.log('[Funcionarios] ✅ Funcionário atualizado com sucesso!');

    // Tentar atualizar senha via Edge Function
    // Senha não pode ser alterada via admin por limitações de segurança do Supabase
    // O usuário deve usar "Esqueci minha senha" na tela de login
    if (dadosAtualizados.senha && dadosAtualizados.senha.trim().length >= 6) {
      console.log('[Funcionarios] ⚠️ Alteração de senha via admin não disponível');
      return {
        success: true,
        warning: 'Dados atualizados com sucesso!\n\n⚠️ Para alterar a senha, o funcionário deve usar "Esqueci minha senha" na tela de login.'
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Funcionarios] ❌ Erro ao atualizar:', error);
    return { success: false, error: error.message };
  }
};
