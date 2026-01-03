/**
 * Verification Script for Sabbatical Logic
 * Run from dashboard directory: npx ts-node src/verify_sabbatical.ts
 */

import { MachineLearningService } from './services/ml/MachineLearningService';
import { TimeEntry, MetaWorkLife } from './models/personametry';
import dayjs from 'dayjs';

const mockEntry = (date: string, hours: number, persona: string): TimeEntry => ({
    date,
    year: parseInt(date.substring(0, 4)),
    month: parseInt(date.substring(5, 7)),
    day: parseInt(date.substring(8, 10)),
    dayOfWeek: '_01 Monday',
    monthName: 'Jan',
    monthNum: parseInt(date.substring(5, 7)),
    weekNum: 1,
    typeOfDay: 'Weekday',
    task: 'Test',
    normalisedTask: 'Test',
    metaWorkLife: MetaWorkLife.WORK,
    prioritisedPersona: persona,
    personaTier2: 'Test',
    hours,
});

const runTest = () => {
    console.log("=== Sabbatical Logic Verification ===\n");
    const entries: TimeEntry[] = [];
    const p3 = 'P3 Professional';

    // 1. Generate Data for 2021-2024 (High Workload - 160h/month)
    [2021, 2022, 2023, 2024].forEach(year => {
        for (let month = 1; month <= 12; month++) {
            const date = dayjs(`${year}-${month.toString().padStart(2, '0')}-15`).format('YYYY-MM-DD');
            entries.push(mockEntry(date, 160, p3));
        }
    });

    // 2. Generate Data for 2025 (Sabbatical - 100h/month < 120h threshold)
    for (let month = 1; month <= 12; month++) {
        const date = dayjs(`2025-${month.toString().padStart(2, '0')}-15`).format('YYYY-MM-DD');
        entries.push(mockEntry(date, 100, p3));
    }

    // 3. Run Service
    const mlService = new MachineLearningService();
    const { forecasts, history2025 } = mlService.prepareBaselines(entries);

    // 4. Verify Results
    const p3Forecast = forecasts[p3]?.forecast[0] ?? 0;
    const p3Actual2025 = history2025[p3] ?? 0;

    console.log(`2025 Actual Average: ${p3Actual2025.toFixed(2)}h (Expected ~100)`);
    console.log(`2026 Forecast: ${p3Forecast.toFixed(2)}h (Expected ~160 from 4-Year Avg)\n`);

    let passed = true;
    
    if (p3Forecast > 150 && p3Forecast < 170) {
        console.log("✅ PASS: Forecast reflects 4-Year Average (BAU).");
    } else {
        console.error(`❌ FAIL: Forecast ${p3Forecast.toFixed(2)} does not match 4-Year Average (expected ~160).`);
        passed = false;
    }

    if (p3Actual2025 < 120) {
        console.log("✅ PASS: 2025 Actual correctly identified as Sabbatical levels.");
    } else {
        console.error("❌ FAIL: 2025 Actual calculation is wrong.");
        passed = false;
    }

    console.log(passed ? "\n=== ALL TESTS PASSED ===" : "\n=== TESTS FAILED ===");
    process.exit(passed ? 0 : 1);
};

runTest();
