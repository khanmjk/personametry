
import { OptimizationService, OptimizationConfig } from './dashboard/src/services/ml/OptimizationService';
import { ForecastResult } from './dashboard/src/services/ml/HoltWintersService';

// Mock Helper
const mockForecast = (value: number): ForecastResult => ({
    forecast: new Array(12).fill(value),
    confidenceUpper: [], confidenceLower: [], model: { alpha: 0, beta: 0, gamma: 0}
});

const optimizer = new OptimizationService();
const baseConfig: OptimizationConfig = {
    hardConstraints: { maxDailyHours: 24, maxWorkHoursPerMonth: 220, minWorkHoursPerMonth: 0 },
    softConstraints: { 
        targetSleepPerDay: 7.5,
        familyTimeGrowth: 1.0, husbandTimeGrowth: 1.0, individualTimeGrowth: 1.0, spiritualTimeGrowth: 1.0
    },
    readinessScore: 0.2 // LOW READINESS
};

console.log('--- Verifying v2.4 Logic (Low Readiness Fix) ---');

// Test: User wants 50% growth (1.5) on 100h baseline. 
// Old Logic: 100 * 1.5 * 0.5 = 75h (DROP!)
// New Logic: 100 + (100 * 0.5 * 0.5) = 125h (Growth, hindered)
console.log('\nTest 4: Low Readiness Growth damping');
const forecasts = { 'P2 Individual': mockForecast(100) };
const config = { ...baseConfig, softConstraints: { ...baseConfig.softConstraints, individualTimeGrowth: 1.50 } };
const result = optimizer.solve(forecasts as any, config);

console.log(`Baseline: 100h. Requested Growth: +50%. Readiness: Low (Factor 0.5).`);
console.log(`Allocated: ${result.individual.toFixed(1)}h`);

if (result.individual > 100) console.log('✅ PASS: Growth occurred despite low readiness');
else console.error('❌ FAIL: Growth was suppressed below baseline');
