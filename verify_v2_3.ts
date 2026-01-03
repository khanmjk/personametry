
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
    readinessScore: 1.0
};

console.log('--- Verifying v2.3 Logic ---');

// 1. Ghost Persona
console.log('\nTest 1: Zero Baseline Growth (Husband)');
const ghostForecasts = { 'P4 Husband': mockForecast(0), 'P3 Professional': mockForecast(160) };
const ghostConfig = { ...baseConfig, softConstraints: { ...baseConfig.softConstraints, husbandTimeGrowth: 1.20 } };
const ghostResult = optimizer.solve(ghostForecasts as any, ghostConfig);
// Expected: 0 -> 5 (floor) -> *1.2 = 6
if (Math.abs(ghostResult.husband - 6) < 0.1) console.log('✅ PASS: 0h baseline grew to 6h (Floor Work)');
else console.error(`❌ FAIL: Got ${ghostResult.husband}, expected 6`);

// 2. Safety Net
console.log('\nTest 2: Contract Floor Enforced');
const safetyForecasts = { 'P3 Professional': mockForecast(100) };
const safetyConfig = { ...baseConfig, hardConstraints: { ...baseConfig.hardConstraints, minWorkHoursPerMonth: 160 } };
const safetyResult = optimizer.solve(safetyForecasts as any, safetyConfig);
if (safetyResult.work === 160) console.log('✅ PASS: 100h baseline boosted to 160h');
else console.error(`❌ FAIL: Got ${safetyResult.work}, expected 160`);

// 3. Health Kick
console.log('\nTest 3: Bonus Time to Health & Self');
const healthForecasts = { 'P3 Professional': mockForecast(160), 'P0 Life Constraints': mockForecast(228) };
// Total ~388h. Cap ~730h. Surplus ~340h should go to Individual.
const healthResult = optimizer.solve(healthForecasts as any, baseConfig);
if (healthResult.individual > 300) console.log(`✅ PASS: Allocated ${healthResult.individual.toFixed(0)}h to Health`);
else console.error(`❌ FAIL: Got ${healthResult.individual}`);
