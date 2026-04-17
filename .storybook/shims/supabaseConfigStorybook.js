import { getMockCompany, getStorybookScenario, resolveAsyncResult } from './storybookScenario.js';

const DEFAULT_SUPPLIERS = [
  {
    id: 'supplier-story-1',
    nome: 'Distribuidora Aurora',
    cnpj: '12.345.678/0001-90',
    contato: '(11) 98888-7777',
    email: 'contato@aurora.com',
  },
];

const DEFAULT_STOCK_CATEGORIES = [
  { id: 'descartaveis', nome: 'Descartáveis', icon: '🥤' },
  { id: 'mercearia', nome: 'Mercearia', icon: '🛒' },
  { id: 'carnes', nome: 'Carnes', icon: '🥩' },
  { id: 'verduras', nome: 'Verduras', icon: '🥬' },
];

function buildQuery(table) {
  const query = {
    operation: 'select',
    payload: null,
    filters: [],
    insert(payload) {
      this.operation = 'insert';
      this.payload = payload;
      return this;
    },
    update(payload) {
      this.operation = 'update';
      this.payload = payload;
      return this;
    },
    upsert(payload) {
      this.operation = 'upsert';
      this.payload = payload;
      return this;
    },
    delete() {
      this.operation = 'delete';
      return this;
    },
    select() {
      this.operation = this.operation || 'select';
      return this;
    },
    eq(field, value) {
      this.filters.push([field, value]);
      return this;
    },
    order() {
      return this;
    },
    maybeSingle() {
      return resolveAsyncResult(() => {
        if (table === 'app_settings') {
          if (getStorybookScenario() === 'empty') {
            return { data: null, error: null };
          }

          return {
            data: {
              id: 'settings-storybook',
              value: {
                stock_categories: DEFAULT_STOCK_CATEGORIES,
              },
            },
            error: null,
          };
        }

        return { data: null, error: null };
      });
    },
    single() {
      return resolveAsyncResult(() => {
        if (table === 'companies' && this.operation === 'select') {
          if (getStorybookScenario() === 'empty') {
            return {
              data: {
                ...getMockCompany(),
                name: '',
                document: '',
                contact_name: '',
                contact_phone: '',
                address: '',
                city: '',
                state: '',
                zip_code: '',
              },
              error: null,
            };
          }

          return { data: getMockCompany(), error: null };
        }

        if (table === 'companies' && this.operation === 'insert') {
          return { data: { id: getMockCompany().id }, error: null };
        }

        if (table === 'profiles') {
          return { data: { id: 'profile-storybook' }, error: null };
        }

        return { data: { id: `${table}-storybook` }, error: null };
      });
    },
    then(onFulfilled, onRejected) {
      return resolveAsyncResult(() => {
        if (table === 'subscriptions') {
          return { data: { id: 'subscription-storybook' }, error: null };
        }

        if (table === 'companies' && this.operation === 'update') {
          return { data: { id: getMockCompany().id }, error: null };
        }

        if (table === 'companies' && this.operation === 'insert') {
          return { data: [{ id: getMockCompany().id }], error: null };
        }

        if (table === 'suppliers' && this.operation === 'select') {
          return {
            data: getStorybookScenario() === 'empty' ? [] : DEFAULT_SUPPLIERS,
            error: null,
          };
        }

        if (
          table === 'suppliers' &&
          (this.operation === 'insert' ||
            this.operation === 'update' ||
            this.operation === 'delete')
        ) {
          return { data: [], error: null };
        }

        if (table === 'app_settings' && this.operation === 'upsert') {
          return { data: [{ id: 'settings-storybook' }], error: null };
        }

        return { data: [], error: null };
      }).then(onFulfilled, onRejected);
    },
  };

  return query;
}

export const supabase = {
  auth: {
    signUp: async () => {
      if (getStorybookScenario() === 'loading') {
        return new Promise(() => undefined);
      }

      if (getStorybookScenario() === 'error') {
        return { data: { user: null }, error: { message: 'already registered' } };
      }

      return {
        data: {
          user: {
            id: 'storybook-user',
          },
        },
        error: null,
      };
    },
    updateUser: async () => {
      if (getStorybookScenario() === 'loading') {
        return new Promise(() => undefined);
      }

      if (getStorybookScenario() === 'error') {
        return { error: { message: 'Nao foi possivel atualizar a senha.' } };
      }

      return { error: null };
    },
    resetPasswordForEmail: async () => {
      if (getStorybookScenario() === 'error') {
        return { error: { message: 'Falha ao enviar email.' } };
      }

      return { error: null };
    },
    signOut: async () => ({ error: null }),
  },
  from(table) {
    return buildQuery(table);
  },
};

export default {
  supabase,
};
