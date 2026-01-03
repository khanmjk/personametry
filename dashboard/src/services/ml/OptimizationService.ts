
/**
 * Goal Programming Optimization Service
 * 
 * Solves for the optimal time allocation profile for 2026.
 * detailed design: /docs/ml-recommendation-design.md
 * 
 * Algorithm: Greedy Heuristic for Multi-Objective Optimization
 * We minimize the total deviation from goals, prioritizing "Hard" constraints first.
 */

import { ForecastResult } from './HoltWintersService';

export interface OptimizationConfig {
    hardConstraints: {
        maxDailyHours: number; // e.g. 24
        maxWorkHoursPerMonth: number; // e.g. 160
        minWorkHoursPerMonth: number; // e.g. 150 (Contract floor)
    };
    softConstraints: {
        targetSleepPerDay: number; // e.g. 7.5
        familyTimeGrowth: number; // e.g. 1.10 (P5 Family)
        husbandTimeGrowth: number; // e.g. 1.10 (P4 Husband)
        individualTimeGrowth: number; // (P2 Individual: Health & Self)
        spiritualTimeGrowth: number;
    };
    readinessScore: number; // 0.0 - 1.0 (Low readiness relaxes targets)
}

export interface OptimizedProfile {
    work: number;     // Monthly Avg Hours
    sleep: number;
    family: number;
    husband: number;
    individual: number;
    social: number;
    spiritual: number;
    // ... other personas
}

export class OptimizationService {
    
    /**
     * Solves for the optimal profile given the forecasts and constraints
     */
    public solve(
        forecasts: Record<string, ForecastResult>, // Keyed by Persona
        config: OptimizationConfig
    ): OptimizedProfile {
        
        // 1. Extract Baselines (Forecasted Avg for next year)
        const baseline = this.extractBaselines(forecasts);
        const daysInMonth = 30.4; // Average

        // 2. Adjust for Readiness (Behavioral Layer)
        // If readiness is low (<0.5), we reduce ambitious goals
        const ambitionFactor = config.readinessScore < 0.5 ? 0.5 : 1.0; 

        // 3. Initialize Profile with Essentials (Sleep)
        // Soft Constraint: Sleep Target
        let sleepHours = config.softConstraints.targetSleepPerDay * daysInMonth; 

        // 4. Allocate Work (Hard Constraint)
        // Baseline work vs Cap. RESPECT CONTRACT FLOOR.
        let workHours = baseline['P3 Professional'] || 0;
        workHours = Math.max(workHours, config.hardConstraints.minWorkHoursPerMonth); // Enforce Floor
        workHours = Math.min(workHours, config.hardConstraints.maxWorkHoursPerMonth); // Enforce Ceiling

        // 5. Allocate Growth Targets (Family, Husband, Health, Spiritual)
        // Fix (v2.3): Apply a minimum floor (5h) if baseline is zero, so growth multiplier works.
        const ensureBaseline = (base: number, min: number = 5) => Math.max(base, min);

        // Fix (v2.4): Apply ambition factor ONLY to the growth delta, not the base.
        // Formula: New = Base + (Base * (Growth - 1) * Ambition)
        const applyGrowth = (base: number, growthRate: number) => {
            const dampedGrowth = 1 + ((growthRate - 1) * ambitionFactor);
            return base * dampedGrowth;
        };

        let familyHours = applyGrowth(ensureBaseline(baseline['P5 Family'] || 0), config.softConstraints.familyTimeGrowth);
        let husbandHours = applyGrowth(ensureBaseline(baseline['P4 Husband'] || 0), config.softConstraints.husbandTimeGrowth);
        let individualHours = applyGrowth(ensureBaseline(baseline['P2 Individual'] || 0), config.softConstraints.individualTimeGrowth);
        let spiritualHours = applyGrowth(ensureBaseline(baseline['P1 Muslim'] || 0), config.softConstraints.spiritualTimeGrowth);
        
        // Social is now Maintenance (Baseline only)
        let socialHours = baseline['P6 Friend Social'] || 0;

        // 6. Feasibility Check & Residual Handling
        // Total Capacity = 24 * 30.4
        const totalCapacity = config.hardConstraints.maxDailyHours * daysInMonth;
        const totalAllocated = sleepHours + workHours + familyHours + husbandHours + individualHours + spiritualHours + socialHours;
        
        // If we are OVER capacity, we must scale back non-essentials (Growth items)
        if (totalAllocated > totalCapacity) {
             const deficit = totalAllocated - totalCapacity;
             // Scale down Growth Items
             const growthTotal = familyHours + husbandHours + individualHours + spiritualHours + socialHours;
             const scaleFactor = (growthTotal - deficit) / growthTotal;
             
             familyHours *= scaleFactor;
             husbandHours *= scaleFactor; // Husband time gets scaled if we are crunched
             individualHours *= scaleFactor;
             spiritualHours *= scaleFactor;
             socialHours *= scaleFactor;
        } else {
             // Bonus Time goes to Individual (Health & Self)
             individualHours += (totalCapacity - totalAllocated);
        }

        return {
            work: workHours,
            sleep: sleepHours,
            family: familyHours,
            husband: husbandHours,
            individual: individualHours,
            social: socialHours,
            spiritual: spiritualHours
        };
    }

    private extractBaselines(forecasts: Record<string, ForecastResult>): Record<string, number> {
        const baselines: Record<string, number> = {};
        for (const [persona, result] of Object.entries(forecasts)) {
            // Average the 12-month forecast to get a "Monthly Run Rate"
            const sum = result.forecast.reduce((a, b) => a + b, 0);
            baselines[persona] = sum / result.forecast.length;
        }
        return baselines;
    }
}
