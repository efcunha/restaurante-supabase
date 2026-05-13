import { supabase } from '../../config/SupabaseConfig';
import { Product } from '../../types';

class SupabaseInventoryService {
  /**
   * Fetch all products (helper)
   */
  async getProducts(companyId: string): Promise<Product[]> {
      const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('company_id', companyId)
          .eq('available', true);
          
      if (error) {
          console.error('Error fetching products', error);
          return [];
      }
      return data as Product[];
  }

  /**
   * Deduct stock for a list of items
   */
  async deductStock(companyId: string, orderItems: any[]): Promise<{ totalCost: number; error?: any }> {
    try {
        // Prepare items for deduction
        // This relies on the 'products' table having a 'stock' column if we track it.
        // Currently, the schema focuses on availability, so this method primarily acts as a cost calculator/hook
        // for future inventory logic.
        
        const totalCost = 0;
        
        // Logical placeholder for stock deduction
        void orderItems.length;

        return { totalCost, error: undefined };

    } catch (error) {
        console.error('Stock deduction error', error);
        return { totalCost: 0, error };
    }
  }

    async checkAvailability(_companyId: string, _productId: string, _quantity: number): Promise<boolean> {
      // Stub implementation: assumed available if 'available' flag is true (checked in getProducts)
      return true;
  }
}

export default new SupabaseInventoryService();
