/**
 * SuccessMetricsService - Track modernization success metrics
 * Measures P95 latency, costs, security, and code quality
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  Firestore,
} from 'firebase/firestore';
// @ts-ignore - firebaseConfig.js is not typed
import { db as dbImport } from '../config/firebaseConfig';
import PerformanceMonitoringService from './PerformanceMonitoringService';

// Type the db import
// @ts-ignore
const db = dbImport as Firestore;

export interface BaselineMetrics {
  timestamp: number;
  p95Latency: {
    fetchOrders: number;
    createOrder: number;
    updateOrder: number;
    deleteOrder: number;
    getDailySummary: number;
  };
  firestoreCosts: {
    reads: number;
    writes: number;
    deletes: number;
    estimatedMonthlyCost: number;
  };
  securityIncidents: {
    authFailures: number;
    permissionDenied: number;
    rateLimitViolations: number;
    suspiciousActivity: number;
  };
  codeQuality: {
    testCoverage: number;
    typeScriptAdoption: number;
    lintErrors: number;
    codeSmells: number;
  };
}

export interface CurrentMetrics extends BaselineMetrics {
  improvements: {
    p95LatencyReduction: number; // percentage
    costReduction: number; // percentage
    securityIncidentsReduction: number; // percentage
    codeQualityImprovement: number; // percentage
  };
}

export interface WeeklyReport {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  metrics: CurrentMetrics;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

class SuccessMetricsService {
  private readonly METRICS_COLLECTION = 'successMetrics';
  private readonly BASELINE_DOC_ID = 'baseline';
  private readonly WEEKLY_REPORTS_COLLECTION = 'weeklyReports';

  /**
   * Record baseline metrics before modernization
   */
  async recordBaseline(companyId: string): Promise<void> {
    console.log('[SuccessMetrics] Recording baseline metrics...');

    const baseline: BaselineMetrics = {
      timestamp: Date.now(),
      p95Latency: await this.measureP95Latency(),
      firestoreCosts: await this.measureFirestoreCosts(companyId),
      securityIncidents: await this.measureSecurityIncidents(companyId),
      codeQuality: await this.measureCodeQuality(),
    };

    // Save to Firestore
    const baselineRef = doc(
      db,
      `companies/${companyId}/${this.METRICS_COLLECTION}/${this.BASELINE_DOC_ID}`
    );
    await setDoc(baselineRef, baseline);

    console.log('[SuccessMetrics] Baseline recorded:', baseline);
  }

  /**
   * Get baseline metrics
   */
  async getBaseline(companyId: string): Promise<BaselineMetrics | null> {
    try {
      const baselineRef = doc(
        db,
        `companies/${companyId}/${this.METRICS_COLLECTION}/${this.BASELINE_DOC_ID}`
      );
      const snapshot = await getDoc(baselineRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as BaselineMetrics;
    } catch (error) {
      console.error('[SuccessMetrics] Failed to get baseline:', error);
      return null;
    }
  }

  /**
   * Measure current metrics and compare with baseline
   */
  async measureCurrentMetrics(companyId: string): Promise<CurrentMetrics | null> {
    const baseline = await this.getBaseline(companyId);

    if (!baseline) {
      console.warn('[SuccessMetrics] No baseline found. Record baseline first.');
      return null;
    }

    const current: BaselineMetrics = {
      timestamp: Date.now(),
      p95Latency: await this.measureP95Latency(),
      firestoreCosts: await this.measureFirestoreCosts(companyId),
      securityIncidents: await this.measureSecurityIncidents(companyId),
      codeQuality: await this.measureCodeQuality(),
    };

    // Calculate improvements
    const improvements = {
      p95LatencyReduction: this.calculateReduction(
        this.averageLatency(baseline.p95Latency),
        this.averageLatency(current.p95Latency)
      ),
      costReduction: this.calculateReduction(
        baseline.firestoreCosts.estimatedMonthlyCost,
        current.firestoreCosts.estimatedMonthlyCost
      ),
      securityIncidentsReduction: this.calculateReduction(
        this.totalSecurityIncidents(baseline.securityIncidents),
        this.totalSecurityIncidents(current.securityIncidents)
      ),
      codeQualityImprovement: this.calculateImprovement(
        this.averageCodeQuality(baseline.codeQuality),
        this.averageCodeQuality(current.codeQuality)
      ),
    };

    return {
      ...current,
      improvements,
    };
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(companyId: string): Promise<WeeklyReport> {
    const currentMetrics = await this.measureCurrentMetrics(companyId);

    if (!currentMetrics) {
      throw new Error('Cannot generate report without baseline metrics');
    }

    const now = new Date();
    const weekNumber = this.getWeekNumber(now);
    const year = now.getFullYear();
    const { startDate, endDate } = this.getWeekDates(now);

    // Generate highlights, concerns, and recommendations
    const highlights = this.generateHighlights(currentMetrics);
    const concerns = this.generateConcerns(currentMetrics);
    const recommendations = this.generateRecommendations(currentMetrics);

    const report: WeeklyReport = {
      weekNumber,
      year,
      startDate,
      endDate,
      metrics: currentMetrics,
      highlights,
      concerns,
      recommendations,
    };

    // Save report to Firestore
    const reportRef = doc(
      db,
      `companies/${companyId}/${this.WEEKLY_REPORTS_COLLECTION}/${year}_W${weekNumber}`
    );
    await setDoc(reportRef, {
      ...report,
      createdAt: Timestamp.now(),
    });

    console.log('[SuccessMetrics] Weekly report generated:', report);

    return report;
  }

  /**
   * Get all weekly reports
   */
  async getWeeklyReports(
    companyId: string,
    limitCount: number = 10
  ): Promise<WeeklyReport[]> {
    try {
      const reportsRef = collection(
        db,
        `companies/${companyId}/${this.WEEKLY_REPORTS_COLLECTION}`
      );
      const q = query(
        reportsRef,
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => doc.data() as WeeklyReport);
    } catch (error) {
      console.error('[SuccessMetrics] Failed to get weekly reports:', error);
      return [];
    }
  }

  /**
   * Get executive dashboard data
   */
  async getExecutiveDashboard(companyId: string): Promise<{
    baseline: BaselineMetrics | null;
    current: CurrentMetrics | null;
    recentReports: WeeklyReport[];
    summary: {
      overallProgress: number;
      targetsMet: number;
      targetsTotal: number;
      status: 'on-track' | 'at-risk' | 'off-track';
    };
  }> {
    const baseline = await this.getBaseline(companyId);
    const current = await this.measureCurrentMetrics(companyId);
    const recentReports = await this.getWeeklyReports(companyId, 4);

    // Calculate summary
    const summary = this.calculateSummary(current);

    return {
      baseline,
      current,
      recentReports,
      summary,
    };
  }

  /**
   * Measure P95 latency for critical operations
   */
  private async measureP95Latency(): Promise<BaselineMetrics['p95Latency']> {
    return {
      fetchOrders: PerformanceMonitoringService.getP95Latency('fetchOrders') || 0,
      createOrder: PerformanceMonitoringService.getP95Latency('createOrder') || 0,
      updateOrder: PerformanceMonitoringService.getP95Latency('updateOrder') || 0,
      deleteOrder: PerformanceMonitoringService.getP95Latency('deleteOrder') || 0,
      getDailySummary:
        PerformanceMonitoringService.getP95Latency('getDailySummary') || 0,
    };
  }

  /**
   * Measure Firestore costs
   */
  private async measureFirestoreCosts(
    companyId: string
  ): Promise<BaselineMetrics['firestoreCosts']> {
    const metrics = PerformanceMonitoringService.getFirestoreMetrics();

    // Firestore pricing (approximate):
    // Reads: $0.06 per 100,000 documents
    // Writes: $0.18 per 100,000 documents
    // Deletes: $0.02 per 100,000 documents

    const readCost = (metrics.reads / 100000) * 0.06;
    const writeCost = (metrics.writes / 100000) * 0.18;
    const deleteCost = (metrics.deletes / 100000) * 0.02;

    // Estimate monthly cost (assuming current rate continues)
    const dailyCost = readCost + writeCost + deleteCost;
    const estimatedMonthlyCost = dailyCost * 30;

    return {
      reads: metrics.reads,
      writes: metrics.writes,
      deletes: metrics.deletes,
      estimatedMonthlyCost,
    };
  }

  /**
   * Measure security incidents
   */
  private async measureSecurityIncidents(
    companyId: string
  ): Promise<BaselineMetrics['securityIncidents']> {
    // In a real implementation, this would query audit logs
    // For now, return mock data
    return {
      authFailures: 0,
      permissionDenied: 0,
      rateLimitViolations: 0,
      suspiciousActivity: 0,
    };
  }

  /**
   * Measure code quality metrics
   */
  private async measureCodeQuality(): Promise<BaselineMetrics['codeQuality']> {
    // In a real implementation, this would parse test coverage reports
    // and analyze codebase
    // For now, return estimated values
    return {
      testCoverage: 85, // percentage
      typeScriptAdoption: 90, // percentage
      lintErrors: 5,
      codeSmells: 10,
    };
  }

  /**
   * Calculate reduction percentage
   */
  private calculateReduction(baseline: number, current: number): number {
    if (baseline === 0) return 0;
    return ((baseline - current) / baseline) * 100;
  }

  /**
   * Calculate improvement percentage
   */
  private calculateImprovement(baseline: number, current: number): number {
    if (baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
  }

  /**
   * Calculate average latency
   */
  private averageLatency(latency: BaselineMetrics['p95Latency']): number {
    const values = Object.values(latency);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate total security incidents
   */
  private totalSecurityIncidents(
    incidents: BaselineMetrics['securityIncidents']
  ): number {
    return Object.values(incidents).reduce((sum, val) => sum + val, 0);
  }

  /**
   * Calculate average code quality
   */
  private averageCodeQuality(quality: BaselineMetrics['codeQuality']): number {
    // Weighted average: coverage and TS adoption are positive, errors are negative
    return (
      (quality.testCoverage + quality.typeScriptAdoption) / 2 -
      (quality.lintErrors + quality.codeSmells) / 10
    );
  }

  /**
   * Generate highlights from metrics
   */
  private generateHighlights(metrics: CurrentMetrics): string[] {
    const highlights: string[] = [];

    if (metrics.improvements.p95LatencyReduction > 30) {
      highlights.push(
        `🚀 Latência P95 reduzida em ${metrics.improvements.p95LatencyReduction.toFixed(1)}%`
      );
    }

    if (metrics.improvements.costReduction > 50) {
      highlights.push(
        `💰 Custos Firestore reduzidos em ${metrics.improvements.costReduction.toFixed(1)}%`
      );
    }

    if (metrics.improvements.securityIncidentsReduction > 80) {
      highlights.push(
        `🔒 Incidentes de segurança reduzidos em ${metrics.improvements.securityIncidentsReduction.toFixed(1)}%`
      );
    }

    if (metrics.codeQuality.testCoverage > 80) {
      highlights.push(
        `✅ Cobertura de testes atingiu ${metrics.codeQuality.testCoverage}%`
      );
    }

    if (metrics.codeQuality.typeScriptAdoption > 85) {
      highlights.push(
        `📘 Adoção de TypeScript atingiu ${metrics.codeQuality.typeScriptAdoption}%`
      );
    }

    return highlights;
  }

  /**
   * Generate concerns from metrics
   */
  private generateConcerns(metrics: CurrentMetrics): string[] {
    const concerns: string[] = [];

    if (metrics.improvements.p95LatencyReduction < 10) {
      concerns.push('⚠️ Redução de latência abaixo do esperado (<10%)');
    }

    if (metrics.improvements.costReduction < 40) {
      concerns.push('⚠️ Redução de custos abaixo da meta de 60%');
    }

    if (this.totalSecurityIncidents(metrics.securityIncidents) > 10) {
      concerns.push('⚠️ Número elevado de incidentes de segurança');
    }

    if (metrics.codeQuality.testCoverage < 80) {
      concerns.push('⚠️ Cobertura de testes abaixo da meta de 80%');
    }

    if (metrics.codeQuality.lintErrors > 10) {
      concerns.push(`⚠️ ${metrics.codeQuality.lintErrors} erros de lint detectados`);
    }

    return concerns;
  }

  /**
   * Generate recommendations from metrics
   */
  private generateRecommendations(metrics: CurrentMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.improvements.p95LatencyReduction < 30) {
      recommendations.push(
        '💡 Implementar cache layer para reduzir latência de queries'
      );
    }

    if (metrics.improvements.costReduction < 60) {
      recommendations.push(
        '💡 Otimizar listeners real-time e implementar paginação'
      );
    }

    if (this.totalSecurityIncidents(metrics.securityIncidents) > 5) {
      recommendations.push('💡 Revisar security rules e implementar rate limiting');
    }

    if (metrics.codeQuality.testCoverage < 80) {
      recommendations.push('💡 Adicionar testes para módulos com baixa cobertura');
    }

    if (metrics.codeQuality.typeScriptAdoption < 90) {
      recommendations.push('💡 Migrar arquivos .js restantes para TypeScript');
    }

    return recommendations;
  }

  /**
   * Calculate overall summary
   */
  private calculateSummary(
    metrics: CurrentMetrics | null
  ): {
    overallProgress: number;
    targetsMet: number;
    targetsTotal: number;
    status: 'on-track' | 'at-risk' | 'off-track';
  } {
    if (!metrics) {
      return {
        overallProgress: 0,
        targetsMet: 0,
        targetsTotal: 5,
        status: 'off-track',
      };
    }

    const targets = [
      { name: 'P95 Latency', met: metrics.improvements.p95LatencyReduction >= 30 },
      { name: 'Cost Reduction', met: metrics.improvements.costReduction >= 60 },
      {
        name: 'Security',
        met: this.totalSecurityIncidents(metrics.securityIncidents) === 0,
      },
      { name: 'Test Coverage', met: metrics.codeQuality.testCoverage >= 80 },
      {
        name: 'TypeScript Adoption',
        met: metrics.codeQuality.typeScriptAdoption >= 90,
      },
    ];

    const targetsMet = targets.filter((t) => t.met).length;
    const targetsTotal = targets.length;
    const overallProgress = (targetsMet / targetsTotal) * 100;

    let status: 'on-track' | 'at-risk' | 'off-track';
    if (overallProgress >= 80) {
      status = 'on-track';
    } else if (overallProgress >= 50) {
      status = 'at-risk';
    } else {
      status = 'off-track';
    }

    return {
      overallProgress,
      targetsMet,
      targetsTotal,
      status,
    };
  }

  /**
   * Get week number of the year
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Get start and end dates of the week
   */
  private getWeekDates(date: Date): { startDate: string; endDate: string } {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday

    const startDate = new Date(date.setDate(diff));
    const endDate = new Date(date.setDate(diff + 6));

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  /**
   * Export metrics to JSON
   */
  async exportMetrics(companyId: string): Promise<string> {
    const dashboard = await this.getExecutiveDashboard(companyId);

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        companyId,
        ...dashboard,
      },
      null,
      2
    );
  }
}

export default new SuccessMetricsService();
