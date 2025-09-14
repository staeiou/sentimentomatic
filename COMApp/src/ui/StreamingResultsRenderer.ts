import { ClassificationResult } from '../nli/ZeroShotClassifier';
import { LabelConfig } from '../labels/LabelManager';

export class StreamingResultsRenderer {
  private container: HTMLElement;
  private tbody: HTMLElement | null = null;
  private multiLabel: boolean;
  private labels: LabelConfig[];
  private texts: string[];

  constructor(container: HTMLElement) {
    this.container = container;
    this.multiLabel = false;
    this.labels = [];
    this.texts = [];
  }

  /**
   * Initialize the table structure with all rows pre-allocated
   */
  initialize(texts: string[], labels: LabelConfig[], multiLabel: boolean): void {
    this.texts = texts;
    this.labels = labels;
    this.multiLabel = multiLabel;

    // Create table structure
    let tableHTML = '<table class="results-table"><thead><tr>';
    tableHTML += '<th>#</th>';
    tableHTML += '<th>Text</th>';

    if (multiLabel) {
      tableHTML += '<th>Predicted Labels</th>';
    } else {
      tableHTML += '<th>Predicted Label</th>';
      tableHTML += '<th>Confidence</th>';
    }

    // Add columns for all label scores
    labels.forEach(label => {
      tableHTML += `<th>${this.escapeHtml(label.name)} Score</th>`;
    });

    tableHTML += '</tr></thead><tbody>';

    // Pre-allocate all rows with pending state
    texts.forEach((text, index) => {
      tableHTML += this.createPendingRow(index, text);
    });

    tableHTML += '</tbody></table>';

    this.container.innerHTML = tableHTML;
    this.tbody = this.container.querySelector('tbody');

    // Make the results section visible
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
      resultsSection.hidden = false;
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Create a pending row with loading indicators
   */
  private createPendingRow(index: number, text: string): string {
    const truncatedText = text.length > 100
      ? text.substring(0, 100) + '...'
      : text;

    let rowHTML = `<tr id="result-row-${index}" class="result-row pending">`;
    rowHTML += `<td class="index-cell">${index + 1}</td>`;
    rowHTML += `<td class="text-preview" title="${this.escapeHtml(text)}">${this.escapeHtml(truncatedText)}</td>`;

    if (this.multiLabel) {
      rowHTML += '<td class="prediction-cell"><span class="pending-dot">⋯</span></td>';
    } else {
      rowHTML += '<td class="prediction-cell"><span class="pending-dot">⋯</span></td>';
      rowHTML += '<td class="confidence-cell"><span class="pending-dot">⋯</span></td>';
    }

    // Add pending cells for all label scores
    this.labels.forEach(() => {
      rowHTML += '<td class="score-cell"><span class="pending-dot">⋯</span></td>';
    });

    rowHTML += '</tr>';
    return rowHTML;
  }

  /**
   * Update a row with classification results
   */
  updateRow(index: number, result: ClassificationResult): void {
    const row = document.getElementById(`result-row-${index}`);
    if (!row) return;

    // Remove pending class and add fade-in animation
    row.classList.remove('pending');
    row.classList.add('fade-in');

    // Clear the row (except index and text cells)
    const cells = row.getElementsByTagName('td');
    let cellIndex = 2; // Start after index and text cells

    if (this.multiLabel) {
      // Multi-label: show all selected labels
      const selectedLabels = result.multiLabel || [];
      const labelsHTML = selectedLabels
        .map(label => `<span class="prediction-badge">${this.escapeHtml(label)}</span>`)
        .join(' ');
      cells[cellIndex].innerHTML = labelsHTML || '<em>None</em>';
      cellIndex++;
    } else {
      // Single-label: show top prediction
      cells[cellIndex].innerHTML = `<span class="prediction-badge">${this.escapeHtml(result.topPrediction)}</span>`;
      cellIndex++;
      cells[cellIndex].innerHTML = `<span class="confidence-score">${(result.topScore * 100).toFixed(1)}%</span>`;
      cellIndex++;
    }

    // Update all label score cells
    this.labels.forEach(label => {
      const prediction = result.predictions.find(p => p.label === label.name);
      const score = prediction ? (prediction.score * 100).toFixed(1) : '0.0';
      cells[cellIndex].innerHTML = `<span class="score-value">${score}%</span>`;
      cellIndex++;
    });

    // Trigger reflow for animation
    row.offsetHeight;
    row.classList.add('visible');
  }

  /**
   * Update progress indicator
   */
  updateProgress(current: number, total: number): void {
    const progressText = document.getElementById('progress-text');
    if (progressText) {
      progressText.textContent = `Classifying ${current}/${total}...`;
    }
  }

  /**
   * Clear the renderer
   */
  clear(): void {
    this.container.innerHTML = '';
    this.tbody = null;
    this.texts = [];
    this.labels = [];
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}