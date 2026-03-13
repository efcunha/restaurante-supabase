/**
 * FieldNormalizationService
 * 
 * Serviço para normalização de campos duplicados no sistema.
 * Consolida numeroComanda/comandaNumber e criadoPor/createdBy.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

export interface OrderFieldMapping {
  // Campos padronizados (novos)
  comandaNumber?: string;
  createdBy?: string;
  
  // Campos deprecated (antigos)
  numeroComanda?: string;
  criadoPor?: string;
}

export interface NormalizedOrder {
  comandaNumber: string;
  createdBy: string;
  hasDeprecatedFields: boolean;
  deprecatedFields: string[];
}

/**
 * Normaliza campos de um order usando merge strategy
 * Prioriza campos novos, mas preserva dados de campos antigos se novos estiverem vazios
 */
export function normalizeOrderFields(data: OrderFieldMapping): NormalizedOrder {
  const deprecatedFields: string[] = [];
  
  // Normaliza comandaNumber
  let comandaNumber = data.comandaNumber;
  if (!comandaNumber && data.numeroComanda) {
    comandaNumber = data.numeroComanda;
    deprecatedFields.push('numeroComanda');
  }
  
  // Normaliza createdBy
  let createdBy = data.createdBy;
  if (!createdBy && data.criadoPor) {
    createdBy = data.criadoPor;
    deprecatedFields.push('criadoPor');
  }
  
  return {
    comandaNumber: comandaNumber || '',
    createdBy: createdBy || '',
    hasDeprecatedFields: deprecatedFields.length > 0,
    deprecatedFields
  };
}

/**
 * Verifica se um order tem campos deprecated
 */
export function hasDeprecatedFields(data: OrderFieldMapping): boolean {
  return !!(data.numeroComanda || data.criadoPor);
}

/**
 * Retorna lista de campos deprecated presentes
 */
export function getDeprecatedFields(data: OrderFieldMapping): string[] {
  const deprecated: string[] = [];
  
  if (data.numeroComanda !== undefined) {
    deprecated.push('numeroComanda');
  }
  
  if (data.criadoPor !== undefined) {
    deprecated.push('criadoPor');
  }
  
  return deprecated;
}

/**
 * Cria objeto com campos normalizados para update
 * Remove campos deprecated se removeDeprecated = true
 */
export function createNormalizedUpdate(
  data: OrderFieldMapping,
  removeDeprecated: boolean = false
): Record<string, any> {
  const normalized = normalizeOrderFields(data);
  const update: Record<string, any> = {};
  
  // Adiciona campos normalizados
  if (normalized.comandaNumber) {
    update.comandaNumber = normalized.comandaNumber;
  }
  
  if (normalized.createdBy) {
    update.createdBy = normalized.createdBy;
  }
  
  // Remove campos deprecated se solicitado
  if (removeDeprecated && normalized.hasDeprecatedFields) {
    // Usa FieldValue.delete() do Firestore para remover campos
    const { FieldValue } = require('firebase/firestore');
    
    if (data.numeroComanda !== undefined) {
      update.numeroComanda = FieldValue.delete();
    }
    
    if (data.criadoPor !== undefined) {
      update.criadoPor = FieldValue.delete();
    }
  }
  
  return update;
}

/**
 * Valida que campos normalizados estão presentes
 */
export function validateNormalizedFields(data: any): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!data.comandaNumber) {
    missingFields.push('comandaNumber');
  }
  
  if (!data.createdBy) {
    missingFields.push('createdBy');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Migra campos de um documento individual
 * Retorna objeto com campos normalizados
 */
export function migrateDocumentFields(data: any): {
  normalized: Record<string, any>;
  hadDeprecatedFields: boolean;
  changes: Array<{ field: string; oldValue: any; newValue: any }>;
} {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const normalized: Record<string, any> = { ...data };
  let hadDeprecatedFields = false;
  
  // Migra numeroComanda → comandaNumber
  if (data.numeroComanda && !data.comandaNumber) {
    normalized.comandaNumber = data.numeroComanda;
    changes.push({
      field: 'comandaNumber',
      oldValue: undefined,
      newValue: data.numeroComanda
    });
    hadDeprecatedFields = true;
  }
  
  // Migra criadoPor → createdBy
  if (data.criadoPor && !data.createdBy) {
    normalized.createdBy = data.criadoPor;
    changes.push({
      field: 'createdBy',
      oldValue: undefined,
      newValue: data.criadoPor
    });
    hadDeprecatedFields = true;
  }
  
  return {
    normalized,
    hadDeprecatedFields,
    changes
  };
}

/**
 * Verifica se período de deprecação expirou (90 dias)
 */
export function isDeprecationPeriodExpired(
  migrationDate: Date,
  deprecationDays: number = 90
): boolean {
  const now = new Date();
  const daysSinceMigration = Math.floor(
    (now.getTime() - migrationDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceMigration >= deprecationDays;
}

/**
 * Calcula data de expiração do período de deprecação
 */
export function getDeprecationExpiryDate(
  migrationDate: Date,
  deprecationDays: number = 90
): Date {
  const expiryDate = new Date(migrationDate);
  expiryDate.setDate(expiryDate.getDate() + deprecationDays);
  return expiryDate;
}

export const FieldNormalizationService = {
  normalizeOrderFields,
  hasDeprecatedFields,
  getDeprecatedFields,
  createNormalizedUpdate,
  validateNormalizedFields,
  migrateDocumentFields,
  isDeprecationPeriodExpired,
  getDeprecationExpiryDate
};
