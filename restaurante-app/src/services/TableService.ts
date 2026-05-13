import { supabase } from '../config/SupabaseConfig';
import { Environment, Table } from '../types';

class TableService {

  // ============================================================================
  // ENVIRONMENTS (AMBIENTES)
  // ============================================================================

  async getEnvironments(companyId: string): Promise<Environment[]> {
    const { data, error } = await supabase
      .from('environments')
      .select('*')
      .eq('company_id', companyId)
      .order('section_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createEnvironment(companyId: string, name: string): Promise<Environment> {
    const { data, error } = await supabase
      .from('environments')
      .insert({ company_id: companyId, name, section_order: 99 }) // Default order
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateEnvironment(environmentId: string, updates: Partial<Environment>): Promise<void> {
    const { error } = await supabase
      .from('environments')
      .update(updates)
      .eq('id', environmentId);

    if (error) throw error;
  }

  async deleteEnvironment(environmentId: string): Promise<void> {
    // Check for tables first? Or cascade on DB? 
    // DB has ON DELETE SET NULL, so tables become orphaned (no environment).
    const { error } = await supabase
      .from('environments')
      .delete()
      .eq('id', environmentId);

    if (error) throw error;
  }

  // ============================================================================
  // TABLES (MESAS)
  // ============================================================================

  async getTables(companyId: string): Promise<Table[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('company_id', companyId)
      .eq('active', true);

    if (error) throw error;
    return data || [];
  }

  async createTable(companyId: string, tableData: Partial<Table>): Promise<Table> {
    const { data, error } = await supabase
      .from('tables')
      .insert({ ...tableData, company_id: companyId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTable(tableId: string, updates: Partial<Table>): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', tableId);

    if (error) throw error;
  }

  async deleteTable(tableId: string): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update({ active: false }) // Soft delete
      .eq('id', tableId);

    if (error) throw error;
  }

  async deleteTablesByEnvironment(environmentId: string): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update({ active: false }) // Soft delete
      .eq('environment_id', environmentId);

    if (error) throw error;
  }

  async findTableByNumber(companyId: string, number: string): Promise<Table | null> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('company_id', companyId)
      .eq('number', number)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }
}

export default new TableService();
