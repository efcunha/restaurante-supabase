export interface ComandaSuspeita {
  numero: number;
  valor: number;
}

export interface DiagnosticoComandasResult {
  total: number;
  validas: number;
  suspeitas: number;
  semValor: number;
  comandasSuspeitas: ComandaSuspeita[];
}

export function diagnosticarComandasSuspeitas(companyId: string): Promise<DiagnosticoComandasResult>;

export function corrigirComandasSuspeitas(companyId: string): Promise<{
  corrigidas: number;
  erros: number;
}>;
