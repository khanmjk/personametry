const fs = require('fs');
const path = require('path');

// Load Data
const dataPath = path.join(__dirname, '../dashboard/public/data/timeentries.json');
try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const json = JSON.parse(rawData);
    const entries = json.entries;

    console.log(`Loaded ${entries.length} entries.`);

    // 1. Daily Totals Analysis
    const dailyTotals = {};
    entries.forEach(e => {
        const date = e.date; // CORRECTED FIELD
        if (!dailyTotals[date]) dailyTotals[date] = 0;
        dailyTotals[date] += e.hours;
    });

    const totals = Object.values(dailyTotals).sort((a, b) => a - b);
    const max = totals[totals.length - 1];
    const p99 = totals[Math.floor(totals.length * 0.99)]; // Top 1%
    const p995 = totals[Math.floor(totals.length * 0.995)]; // Top 0.5%
    const p999 = totals[Math.floor(totals.length * 0.999)]; // Top 0.1%

    console.log('\n--- Daily Totals Analysis ---');
    console.log(`Max Hours in Day: ${max.toFixed(2)}h`);
    console.log(`P99 (Top 1%): ${p99.toFixed(2)}h`);
    console.log(`P99.9 (Top 0.1%): ${p999.toFixed(2)}h`);
    console.log(`Entries > 24h: ${totals.filter(t => t > 24).length}`);
    console.log(`Entries > 30h: ${totals.filter(t => t > 30).length}`);
    console.log(`Entries > 34h: ${totals.filter(t => t > 34).length}`);
    console.log(`Entries > 36h: ${totals.filter(t => t > 36).length}`);

    // Frequency of totals around 24-30
    console.log('Histogram > 30h:');
    const over30 = totals.filter(t => t > 30);
    over30.forEach(t => console.log(`- ${t.toFixed(2)}h`));
    
    // 2. Sleep Streak Analysis
    // Filter for Sleep tasks
    const sleepEntries = entries.filter(e => 
        (e.taskName && e.taskName === 'Sleep') || 
        (e.projectName && e.projectName.includes('Life Constraints') && e.taskName && e.taskName.includes('Sleep')) ||
        (e.notes && e.notes.includes('Sleep')) // Fallback
    );

    const sleepByDate = {};
    sleepEntries.forEach(e => {
        if (!sleepByDate[e.date]) sleepByDate[e.date] = 0;
        sleepByDate[e.date] += e.hours;
    });

    const dates = Object.keys(dailyTotals).sort();
    if (dates.length === 0) {
        console.log('No dates found.');
        process.exit(0);
    }
    
    // Simple date iteration
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    
    let maxStreak = 0;
    let currentStreak = 0;
    let streakDetails = [];

    for (let d = new Date(firstDate); d <= lastDate; d.setTime(d.getTime() + oneDay)) {
        const dateStr = d.toISOString().split('T')[0];
        const sleepHours = sleepByDate[dateStr] || 0;

        if (sleepHours < 4) {
            currentStreak++;
            if (currentStreak >= 2) {
                 // console.log(`Streak > 2 detected ending ${dateStr}`);
            }
        } else {
             if (currentStreak > maxStreak) maxStreak = currentStreak;
             currentStreak = 0;
        }
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;

    console.log('\n--- Sleep Streak Analysis ---');
    console.log(`Max Consecutive Days with <4h Sleep: ${maxStreak}`);

} catch (err) {
    console.error("Error reading file:", err.message);
}
