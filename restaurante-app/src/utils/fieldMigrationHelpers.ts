/**
 * Field Migration Helpers
 * 
 * Helpers para facilitar migração gradual de campos deprecated.
 * Permite código funcionar com ambos os campos durante período de transição.
 * 
 * Requirements: 15.3, 15.4
 */

/**
 * Obtém comandaNumber de um objeto, suportando ambos os campos
 * Prioriza campo novo (comandaNumber), mas aceita deprecated (numeroComanda)
 */
export function getComandaNumber(data: any): string {
  return data.comandaNumber || data.numeroComanda || '';
}

/**
 * Obtém createdBy de um objeto, suportando ambos os campos
 * Prioriza campo novo (createdBy), mas aceita deprecated (criadoPor)
 */
export function getCreatedBy(data: any): string {
  return data.createdBy || data.criadoPor || '';
}

/**
 * Cria objeto com ambos os campos para compatibilidade durante migração
 * Usa campo normalizado como fonte de verdade
 */
export function createCompatibleOrderFields(data: {
  comandaNumber: string;
  createdBy: string;
}): {
  comandaNumber: string;
  createdBy: string;
  // Campos deprecated para compatibilidade
  numeroComanda?: string;
  criadoPor?: string;
} {
  return {
    comandaNumber: data.comandaNumber,
    createdBy: data.createdBy,
    // Mantém campos deprecated durante período de transição
    numeroComanda: data.comandaNumber,
    criadoPor: data.createdBy
  };
}

/**
 * Remove campos deprecated de um objeto
 * Útil para limpeza após migração
 */
export function removeDeprecatedFields(data: any): any {
  const normalized = { ...data };
  delete normalized.numeroComanda;
  delete normalized.criadoPor;
  return normalized;
}

/**
 * Verifica se objeto tem apenas campos normalizados (sem deprecated)
 */
export function hasOnlyNormalizedFields(data: any): boolean {
  return (
    data.comandaNumber !== undefined &&
    data.createdBy !== undefined &&
    data.numeroComanda === undefined &&
    data.criadoPor === undefined
  );
}

/**
 * Migra campos de um objeto in-place
 * Útil para processar dados antes de salvar
 */
export function migrateFieldsInPlace(data: any): void {
  // Migra numeroComanda → comandaNumber
  if (data.numeroComanda && !data.comandaNumber) {
    data.comandaNumber = data.numeroComanda;
  }
  
  // Migra criadoPor → createdBy
  if (data.criadoPor && !data.createdBy) {
    data.createdBy = data.criadoPor;
  }
}

export const FieldMigrationHelpers = {
  getComandaNumber,
  getCreatedBy,
  createCompatibleOrderFields,
  removeDeprecatedFields,
  hasOnlyNormalizedFields,
  migrateFieldsInPlace
};
