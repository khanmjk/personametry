
/**
 * Behavioral Intelligence Layer: Readiness Score
 * 
 * Calculus of "Human Capacity". 
 * Modeled after Oura/Whoop scores but derived from Time Data.
 * 
 * Formula:
 * Readiness = (SleepQualityWeight * SleepScore) + (WorkLoadWeight * WorkBalanceScore) + (RecoveryWeight * MeTimeScore)
 */

import { TimeEntry } from '@/models/personametry';
import dayjs from 'dayjs';

export class ReadinessService {
    
    /**
     * Calculates Readiness Score (0.0 - 1.0) based on recent history (last 30 days)
     */
    public calculateReadiness(recentHistory: TimeEntry[]): number {
        if (recentHistory.length === 0) return 0.5; // Neutral default

        // 1. Sleep Score (Target: 7.5h/day)
        const avgDailySleep = this.calculateAvgDailyHours(recentHistory, 'P0 Life Constraints (Sleep)');
        // Score: 1.0 if >= 7.5h, scales down linearly to 0 at 4h
        const sleepScore = Math.min(1, Math.max(0, (avgDailySleep - 4) / (7.5 - 4)));

        // 2. Work Balance Score (Target: < 9h/day)
        const avgDailyWork = this.calculateAvgDailyHours(recentHistory, 'P3 Professional');
        // Score: 1.0 if <= 6h, 0.0 if >= 10h
        const workScore = Math.min(1, Math.max(0, 1 - ((avgDailyWork - 6) / (10 - 6))));

        // 3. Recovery Score (Me Time + Spiritual) (Target: > 2h/day)
        // User confirmed: Spiritual retreats (e.g., Ramadan Itikaf) count as recovery
        const avgDailyMeTime = this.calculateAvgDailyHours(recentHistory, 'P2 Individual');
        const avgDailySpiritual = this.calculateAvgDailyHours(recentHistory, 'P1 Muslim');
        const totalRecovery = avgDailyMeTime + avgDailySpiritual;
        const meTimeScore = Math.min(1, Math.max(0, totalRecovery / 2));

        // Weighted Average
        // Sleep is heavily weighted (50%) as it's the foundation
        const weightedScore = (sleepScore * 0.5) + (workScore * 0.3) + (meTimeScore * 0.2);

        return parseFloat(weightedScore.toFixed(2));
    }

    /**
     * Returns detailed breakdown for UI display (narrative card)
     */
    public calculateReadinessBreakdown(recentHistory: TimeEntry[]): {
        overall: number;
        sleepScore: number;
        workScore: number;
        recoveryScore: number;
        avgDailySleep: number;
        avgDailyWork: number;
        avgDailyRecovery: number;
    } {
        if (recentHistory.length === 0) {
            return { overall: 0.5, sleepScore: 0.5, workScore: 0.5, recoveryScore: 0.5, avgDailySleep: 0, avgDailyWork: 0, avgDailyRecovery: 0 };
        }

        // 1. Sleep Score
        const avgDailySleep = this.calculateAvgDailyHours(recentHistory, 'P0 Life Constraints (Sleep)');
        const sleepScore = Math.min(1, Math.max(0, (avgDailySleep - 4) / (7.5 - 4)));

        // 2. Work Balance Score
        const avgDailyWork = this.calculateAvgDailyHours(recentHistory, 'P3 Professional');
        const workScore = Math.min(1, Math.max(0, 1 - ((avgDailyWork - 6) / (10 - 6))));

        // 3. Recovery Score (Me Time + Spiritual)
        const avgDailyMeTime = this.calculateAvgDailyHours(recentHistory, 'P2 Individual');
        const avgDailySpiritual = this.calculateAvgDailyHours(recentHistory, 'P1 Muslim');
        const avgDailyRecovery = avgDailyMeTime + avgDailySpiritual;
        const recoveryScore = Math.min(1, Math.max(0, avgDailyRecovery / 2));

        // Weighted Overall
        const overall = parseFloat(((sleepScore * 0.5) + (workScore * 0.3) + (recoveryScore * 0.2)).toFixed(2));

        return {
            overall,
            sleepScore: parseFloat(sleepScore.toFixed(2)),
            workScore: parseFloat(workScore.toFixed(2)),
            recoveryScore: parseFloat(recoveryScore.toFixed(2)),
            avgDailySleep: parseFloat(avgDailySleep.toFixed(1)),
            avgDailyWork: parseFloat(avgDailyWork.toFixed(1)),
            avgDailyRecovery: parseFloat(avgDailyRecovery.toFixed(1)),
        };
    }

    private calculateAvgDailyHours(entries: TimeEntry[], persona: string): number {
        const personaEntries = entries.filter(e => e.prioritisedPersona === persona);
        const totalHours = personaEntries.reduce((sum, e) => sum + e.hours, 0);
        
        // Count unique days in range roughly
        // Simplified: Assumes 'recentHistory' is a specific window (e.g. 30 days) provided by caller
        // Ideally we'd count distinct dates, but for now we divide by 30 or similar passed in context
        // IMPROVEMENT: Let's extract date range dynamically
        if (personaEntries.length === 0) return 0;
        
        const dates = new Set(personaEntries.map(e => dayjs(e.date).format('YYYY-MM-DD')));
        return totalHours / Math.max(1, dates.size);
    }
}
