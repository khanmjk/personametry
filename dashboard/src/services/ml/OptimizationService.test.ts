import { OptimizationService } from '../OptimizationService';
import { ForecastResult } from '../HoltWintersService';

// Mock Data
const mockForecast = (value: number): ForecastResult => ({
    forecast: new Array(12).fill(value),
    confidenceUpper: [], 
    confidenceLower: [], 
    model: { alpha: 0, beta: 0, gamma: 0}
});

describe('OptimizationService v2.3', () => {
    let optimizer: OptimizationService;
    
    // Standard Config
    const baseConfig = {
        hardConstraints: { 
            maxDailyHours: 24, 
            maxWorkHoursPerMonth: 220, 
            minWorkHoursPerMonth: 0 
        },
        softConstraints: { 
            targetSleepPerDay: 7.5, // 228h/mo
            familyTimeGrowth: 1.0,
            husbandTimeGrowth: 1.0,
            individualTimeGrowth: 1.0,
            spiritualTimeGrowth: 1.0,
        },
        readinessScore: 1.0
    };

    beforeEach(() => {
        optimizer = new OptimizationService();
    });

    test('Scenario 1: The "Ghost" Persona (Zero Baseline Growth)', () => {
        // Husband has 0h history
        const forecasts = {
            'P4 Husband': mockForecast(0),
            'P3 Professional': mockForecast(160)
        };

        // User requests +20% Husband Focus
        const config = {
            ...baseConfig,
            softConstraints: {
                ...baseConfig.softConstraints,
                husbandTimeGrowth: 1.20 
            }
        };

        const result = optimizer.solve(forecasts, config);
        
        // Logic: 0h baseline -> bumped to 5h floor -> applied 1.2x growth -> 6h
        expect(result.husband).toBeCloseTo(6.0, 1); 
        console.log(`✅ Ghost Persona: 0h Baseline -> ${result.husband}h (Expected 6h)`);
    });

    test('Scenario 2: The "Safety Net" (Contract Floor)', () => {
        // Work history is low (100h)
        const forecasts = {
            'P3 Professional': mockForecast(100)
        };
        
        // Contract says 160h minimum
        const config = {
            ...baseConfig,
            hardConstraints: {
                ...baseConfig.hardConstraints,
                minWorkHoursPerMonth: 160
            }
        };

        const result = optimizer.solve(forecasts, config);
        
        expect(result.work).toBe(160);
        console.log(`✅ Safety Net: 100h Baseline -> ${result.work}h (Floor Enforced)`);
    });

    test('Scenario 3: The "Health Kick" (Bonus Time Allocation)', () => {
        // Low utilization scenario
        const forecasts = {
            'P3 Professional': mockForecast(100), // Work
            'P0 Life Constraints': mockForecast(228) // Sleep
        };
        
        // Total allocated ~ 328h. Capacity ~ 730h.
        // Surplus should flow to Individual
        const result = optimizer.solve(forecasts, baseConfig);

        expect(result.individual).toBeGreaterThan(300);
        console.log(`✅ Health Kick: Allocated Surplus (${result.individual.toFixed(0)}h) to Health & Self`);
    });

    test('Scenario 4: The "Burnout" (Readiness Check)', () => {
        const forecasts = {
            'P4 Husband': mockForecast(20)
        };

        // User wants 50% growth, but Readiness is bad (0.2)
        const config = {
            ...baseConfig,
            softConstraints: {
                ...baseConfig.softConstraints,
                husbandTimeGrowth: 1.50
            },
            readinessScore: 0.2 // Bad readiness
        };

        const result = optimizer.solve(forecasts, config);
        
        // Ambition Factor 0.5 applied to Growth
        // Expected: 20h * 1.5 * 0.5 = 15h? 
        // Or logic: baseline * growth * ambition?
        // Let's check logic: ensureBaseline(20) * 1.5 * 0.5 = 15.
        
        expect(result.husband).toBe(15);
        console.log(`✅ Burnout Protection: Target reduced to ${result.husband}h due to low readiness`);
    });

});
