import { CompanySettingsService } from './CompanySettingsService';
import { formatDateKey, getBusinessDayStart } from '../utils/dateUtils';

export async function getBusinessDateKey(companyId: string): Promise<string> {
  try {
    const settings = await CompanySettingsService.getSettings(companyId);
    const cutoffHour = Number.isInteger(settings.businessDayCutoff)
      ? settings.businessDayCutoff!
      : 6;

    return formatDateKey(getBusinessDayStart(cutoffHour));
  } catch (error) {
    console.warn('[BusinessDateService] Failed to resolve businessDayCutoff, using default 6 AM:', error);
    return formatDateKey(getBusinessDayStart(6));
  }
}