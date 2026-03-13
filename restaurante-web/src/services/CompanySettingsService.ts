
import { supabase } from '../config/SupabaseConfig';
import { CompanySettings } from '../types/models';

export const CompanySettingsService = {
  /**
   * Fetches company settings.
   * Returns default settings if none found or error.
   */
  getSettings: async (companyId: string): Promise<CompanySettings> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('Error fetching company settings:', error);
        return { businessDayCutoff: 6 }; // Default fallback
      }

      return data?.settings || { businessDayCutoff: 6 };
    } catch (error) {
      console.error('Unexpected error fetching settings:', error);
      return { businessDayCutoff: 6 };
    }
  },

  /**
   * Updates company settings.
   * Merges with existing settings.
   */
  updateSettings: async (companyId: string, newSettings: Partial<CompanySettings>) => {
    try {
      // First fetch existing to merge
      const { data: existingData } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', companyId)
        .single();

      const currentSettings = existingData?.settings || {};
      const updatedSettings = { ...currentSettings, ...newSettings };

      const { error } = await supabase
        .from('companies')
        .update({ 
          settings: updatedSettings,
          updated_at: new Date().toISOString() 
        })
        .eq('id', companyId);

      if (error) throw error;
      return updatedSettings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
};
