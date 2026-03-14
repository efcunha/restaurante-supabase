export interface CleanSummary {
  found: number;
  deleted: number;
  errors: number;
}

export interface CleanAllZeroValuesResult {
  pedidos: CleanSummary;
  comandas: CleanSummary;
}

export function cleanAllZeroValues(companyId: string, dryRun?: boolean): Promise<CleanAllZeroValuesResult>;
