import type { ClassificationResult } from '../nli/ZeroShotClassifier';
import type { LabelConfig } from '../labels/LabelManager';

export interface ExportData {
  results: ClassificationResult[];
  labels: LabelConfig[];
  multiLabel: boolean;
  timestamp: string;
}

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export results to CSV format
 */
export function exportToCSV(data: ExportData): void {
  const { results, labels, multiLabel } = data;

  if (results.length === 0) {
    alert('No results to export');
    return;
  }

  let csvContent = '';

  // Create header
  const header = ['Text'];

  if (multiLabel) {
    header.push('Predicted Labels');
    labels.forEach(label => {
      header.push(`${label.name} Score`);
    });
  } else {
    header.push('Predicted Label', 'Confidence');
    labels.forEach(label => {
      header.push(`${label.name} Score`);
    });
  }

  csvContent = header.map(h => escapeCSV(h)).join(',') + '\n';

  // Add data rows
  results.forEach(result => {
    const row = [escapeCSV(result.text)];

    if (multiLabel) {
      // Multi-label: show all labels above threshold
      const selectedLabels = result.multiLabel || [];
      row.push(escapeCSV(selectedLabels.join('; ')));

      // Add all label scores
      labels.forEach(label => {
        const prediction = result.predictions.find(p => p.label === label.name);
        row.push(escapeCSV((prediction?.score || 0).toFixed(3)));
      });
    } else {
      // Single-label: show top prediction
      row.push(escapeCSV(result.topPrediction));
      row.push(escapeCSV(result.topScore.toFixed(3)));

      // Add all label scores
      labels.forEach(label => {
        const prediction = result.predictions.find(p => p.label === label.name);
        row.push(escapeCSV((prediction?.score || 0).toFixed(3)));
      });
    }

    csvContent += row.join(',') + '\n';
  });

  // Download file
  downloadFile(csvContent, 'text/csv', 'classification_results.csv');
}

/**
 * Export results to JSON format
 */
export function exportToJSON(data: ExportData): void {
  const { results, labels, multiLabel, timestamp } = data;

  if (results.length === 0) {
    alert('No results to export');
    return;
  }

  const exportData = {
    metadata: {
      timestamp,
      model: 'Xenova/nli-deberta-v3-xsmall',
      multiLabel,
      totalTexts: results.length,
      labels: labels.map(l => ({
        name: l.name,
        sentence: l.sentence,
        threshold: l.threshold
      }))
    },
    results: results.map(result => ({
      text: result.text,
      topPrediction: result.topPrediction,
      topScore: result.topScore,
      multiLabel: result.multiLabel,
      allScores: Object.fromEntries(
        result.predictions.map(p => [p.label, p.score])
      )
    }))
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, 'application/json', 'classification_results.json');
}

/**
 * Export configuration for reproducibility
 */
export function exportConfig(labels: LabelConfig[], multiLabel: boolean): void {
  const config = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    multiLabel,
    labels: labels.map(l => ({
      id: l.id,
      name: l.name,
      sentence: l.sentence,
      threshold: l.threshold
    }))
  };

  const jsonContent = JSON.stringify(config, null, 2);
  downloadFile(jsonContent, 'application/json', 'classification_config.json');
}

/**
 * Helper to download a file
 */
function downloadFile(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Add timestamp to filename
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  const timestampedFilename = filename.replace(/\.(csv|json)$/, `_${timestamp}.$1`);

  link.setAttribute('href', url);
  link.setAttribute('download', timestampedFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Parse CSV file for import (future enhancement)
 */
export async function parseCSV(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');

        // Simple CSV parsing - assumes first column is text
        // Skip header row
        const texts = lines
          .slice(1)
          .filter(line => line.trim())
          .map(line => {
            // Handle quoted values
            if (line.startsWith('"')) {
              const endQuote = line.indexOf('"', 1);
              return line.substring(1, endQuote).replace(/""/g, '"');
            }
            // Simple comma split
            return line.split(',')[0];
          });

        resolve(texts);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsText(file);
  });
}