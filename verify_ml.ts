
import { MachineLearningService } from './dashboard/src/services/ml/MachineLearningService';
import { OptimizationService } from './dashboard/src/services/ml/OptimizationService';

// Mock Forecast Result (12 months of 160h work, 220h sleep, etc)
const mockForecast = {
    forecast: new Array(12).fill(160),
    confidenceUpper: [], confidenceLower: [], model: { alpha: 0, beta: 0, gamma: 0}
};

const forecasts = {
    'P3 Professional': { ...mockForecast, forecast: new Array(12).fill(180) }, // High work baseline (180h)
    'P0 Life Constraints': { ...mockForecast, forecast: new Array(12).fill(210) }, // ~7h sleep
    'P5 Family': { ...mockForecast, forecast: new Array(12).fill(50) }
};

console.log('--- Testing Optimization Engine (v2.1) ---');
console.log('Scenario A: Low Baseline (90h) vs Contract Floor (160h)');
// Mock low forecast
const lowWorkForecasts = {
    ...forecasts,
    'P3 Professional': { ...mockForecast, forecast: new Array(12).fill(90) },
    'P4 Husband': { ...mockForecast, forecast: new Array(12).fill(20) } // Baseline 20h
};

const optimizer = new OptimizationService();
const result = optimizer.solve(lowWorkForecasts as any, {
    hardConstraints: { 
        maxDailyHours: 24, 
        maxWorkHoursPerMonth: 200, 
        minWorkHoursPerMonth: 160 // CONTRACT FLOOR
    },
    softConstraints: { 
        targetSleepPerDay: 7.5, 
        familyTimeGrowth: 1.10,
        husbandTimeGrowth: 1.15, // +15% Husband Focus
        individualTimeGrowth: 1.20, // +20% Health & Self
        spiritualTimeGrowth: 1.0
    },
    readinessScore: 0.8 // Good readiness
});

console.log('Optimized Profile:', result);

// Validation
if (result.work >= 160) {
    console.log('✅ Contract Floor Enforced: Work boosted to 160h (baseline was 90h)');
} else {
    console.log(`❌ Contract Floor Failed: Work is ${result.work}`);
}

if (result.husband > 0) {
     console.log(`✅ Husband Growth: Allocated ${result.husband.toFixed(1)} hours`);
}

if (result.individual > 0) {
     console.log(`✅ Health & Self (Individual): Allocated ${result.individual.toFixed(1)} hours`);
}
