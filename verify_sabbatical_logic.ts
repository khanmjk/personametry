
import { MachineLearningService } from './dashboard/src/services/ml/MachineLearningService';
import { TimeEntry } from './dashboard/src/models/personametry';
import dayjs from 'dayjs';

const mockEntry = (date: string, hours: number, persona: string): TimeEntry => ({
    id: 1,
    project: 'Test',
    client: 'Test',
    task: 'Test',
    date: date,
    hours: hours,
    notes: '',
    isBillable: false,
    prioritisedPersona: persona
});

const runTest = () => {
    console.log("Starting Sabbatical Logic Verification...");
    const entries: TimeEntry[] = [];
    const p3 = 'P3 Professional';

    // 1. Generate Data for 2021-2024 (High Workload - The "Average" Target)
    // Let's say 160h/month for simplicity
    [2021, 2022, 2023, 2024].forEach(year => {
        for (let month = 0; month < 12; month++) {
            const date = dayjs(`${year}-${month + 1}-15`).format('YYYY-MM-DD');
            entries.push(mockEntry(date, 160, p3));
        }
    });

    // 2. Generate Data for 2025 (Sabbatical - Low Workload)
    // 100h/month (< 120h threshold)
    for (let month = 0; month < 12; month++) {
        const date = dayjs(`2025-${month + 1}-15`).format('YYYY-MM-DD');
        entries.push(mockEntry(date, 100, p3));
    }

    // 3. Run Service
    const mlService = new MachineLearningService();
    const { forecasts, history2025 } = mlService.prepareBaselines(entries);

    // 4. Verify Results
    const p3Forecast = forecasts[p3].forecast[0];
    const p3Actual2025 = history2025[p3];

    console.log(`2025 Actual Average: ${p3Actual2025.toFixed(2)}h (Expected ~100)`);
    console.log(`2026 Forecast: ${p3Forecast.toFixed(2)}h (Expected ~160)`);

    if (p3Forecast > 150 && p3Forecast < 170) {
        console.log("✅ PASS: Forecast reflects 4-Year Average (BAU).");
    } else {
        console.error("❌ FAIL: Forecast does not match 4-Year Average.");
    }

    if (p3Actual2025 < 120) {
        console.log("✅ PASS: 2025 Actual correctly identified as Sabbatical levels.");
    } else {
        console.error("❌ FAIL: 2025 Actual calculation is wrong.");
    }
};

runTest();
