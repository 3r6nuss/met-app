const { execSync } = require('child_process');

// Einstellungen (Dies sind exakt die Standardwerte von git-hours)
const MAX_DIFF_MINUTES = 120;        // Zeitfenster für eine Sitzung (2 Stunden)
const FIRST_COMMIT_ADD_MINUTES = 30; // Zeitaufwand, der für den ersten Commit einer Sitzung geschätzt wird

try {
  // Holt die Autoren-E-Mail und das Commit-Datum aus der Git-Historie
  const logData = execSync('git log --all --pretty=format:"%ae|%ai"', { encoding: 'utf-8' });
  const lines = logData.trim().split('\n').filter(Boolean);

  if (lines.length === 0) {
    console.log("Keine Commits im Repository gefunden.");
    process.exit(0);
  }

  // Commits parsen und chronologisch sortieren (älteste zuerst)
  const commits = lines.map(line => {
    const [author, dateStr] = line.split('|');
    return { author, date: new Date(dateStr) };
  }).sort((a, b) => a.date - b.date);

  const authors = {};

  commits.forEach(commit => {
    const author = commit.author;
    if (!authors[author]) {
      authors[author] = {
        lastCommitDate: null,
        totalMinutes: 0,
        commitCount: 0
      };
    }

    const stats = authors[author];
    stats.commitCount++;

    if (!stats.lastCommitDate) {
      // Erster Commit dieses Entwicklers
      stats.totalMinutes += FIRST_COMMIT_ADD_MINUTES;
    } else {
      const diffMs = commit.date - stats.lastCommitDate;
      const diffMinutes = diffMs / 1000 / 60;

      if (diffMinutes <= MAX_DIFF_MINUTES) {
        // Gehört zur selben Sitzung -> Zeitdifferenz addieren
        stats.totalMinutes += diffMinutes;
      } else {
        // Neue Sitzung gestartet -> Pauschalzeit addieren
        stats.totalMinutes += FIRST_COMMIT_ADD_MINUTES;
      }
    }

    stats.lastCommitDate = commit.date;
  });

  console.log("\n=== Geschätzte Arbeitszeit pro Entwickler ===");
  let overallTotalHours = 0;
  
  Object.keys(authors).forEach(author => {
    const hours = (authors[author].totalMinutes / 60).toFixed(1);
    overallTotalHours += parseFloat(hours);
    console.log(`- ${author}: ${hours} Std. (${authors[author].commitCount} Commits)`);
  });

  console.log("=============================================");
  console.log(`Gesamte geschätzte Arbeitszeit: ${overallTotalHours.toFixed(1)} Std.\n`);

} catch (error) {
  console.error("Fehler beim Ausführen von Git:", error.message);
}