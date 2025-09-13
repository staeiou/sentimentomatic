import type { SentimentResult } from '../types';
import { formatDuration } from '../utils/textProcessor';

export class ResultsTable {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(results: SentimentResult[]): void {
    if (results.length === 0) {
      this.container.innerHTML = '<p class="loading">No results to display</p>';
      return;
    }

    // Group results by text
    const resultsByText = new Map<string, SentimentResult[]>();
    results.forEach(result => {
      if (!resultsByText.has(result.text)) {
        resultsByText.set(result.text, []);
      }
      resultsByText.get(result.text)!.push(result);
    });

    // Get all analyzers used
    const analyzers = [...new Set(results.map(r => r.analyzer))];

    // Create table HTML
    const tableHTML = `
      <div class="results-table">
        <table>
          <thead>
            <tr>
              <th>Line</th>
              <th>Text</th>
              ${analyzers.map(analyzer => `
                <th>
                  ${analyzer} ${this.getScoreRangeInfo(analyzer)}
                  <span class="score-info-toggle" data-analyzer="${analyzer.replace(/\s+/g, '-').toLowerCase()}">[more]</span>
                  <div class="score-info-details" id="info-${analyzer.replace(/\s+/g, '-').toLowerCase()}" style="display: none;">
                    ${this.getDetailedScoreInfo(analyzer)}
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from(resultsByText.entries()).map(([text, textResults], index) => `
              <tr>
                <td>${index + 1}</td>
                <td class="text-cell">${this.escapeHtml(text)}</td>
                ${analyzers.map(analyzer => {
                  const result = textResults.find(r => r && r.analyzer === analyzer);
                  if (result) {
                    const colorClass = this.getScoreColorClass(result.analyzer, result.score);
                    // Show predicted class label with score for multiclass models
                    const displayValue = (result.scores as any)?.predictedClass 
                      ? `${(result.scores as any).predictedClass}: ${result.score.toFixed(3)}`
                      : result.score.toFixed(3);
                    return `
                      <td class="score-cell ${colorClass}">${displayValue}</td>
                    `;
                  } else {
                    return '<td class="error-cell">ERROR</td>';
                  }
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="results-summary">
        <h3>Analysis Summary</h3>
        <p><strong>Total Lines:</strong> ${resultsByText.size}</p>
        <p><strong>Analyzers Used:</strong> ${analyzers.join(', ')}</p>
        <p><strong>Total Processing Time:</strong> ${formatDuration(results.reduce((sum, r) => sum + r.processingTime, 0))}</p>
        <p><strong>Average per Line:</strong> ${formatDuration(results.reduce((sum, r) => sum + r.processingTime, 0) / resultsByText.size)}</p>
      </div>
    `;

    this.container.innerHTML = tableHTML;
    
    // Add event listeners for score info toggles
    this.setupScoreInfoToggles();
  }

  // Commented out unused method
  /*
  private formatScores(result: SentimentResult): string {
    const scores = result.scores;
    const parts: string[] = [];

    if (scores.compound !== undefined) {
      parts.push(`C:${scores.compound.toFixed(3)}`);
    }
    if (scores.score !== undefined) {
      parts.push(`S:${scores.score}`);
    }
    if (scores.comparative !== undefined) {
      parts.push(`Comp:${scores.comparative.toFixed(3)}`);
    }
    if (scores.positive !== undefined && scores.negative !== undefined) {
      parts.push(`+:${scores.positive.toFixed(3)}`);
      parts.push(`-:${scores.negative.toFixed(3)}`);
    }

    return parts.join(' | ');
  }
  */

  private getScoreRangeInfo(analyzer: string): string {
    const analyzerLower = analyzer.toLowerCase();
    
    if (analyzerLower.includes('afinn')) {
      return '<small>(-5 to +5)</small>';
    }
    
    if (analyzerLower.includes('vader')) {
      return '<small>(-1 to +1)</small>';
    }
    
    // HuggingFace models
    return '<small>(-1 to +1)</small>';
  }

  private getDetailedScoreInfo(analyzer: string): string {
    const analyzerLower = analyzer.toLowerCase();
    
    if (analyzerLower.includes('afinn')) {
      return `
        <div class="score-explanation">
          <strong>AFINN Comparative Score:</strong>
          <ul>
            <li><strong>Range:</strong> -5 to +5</li>
            <li><strong>Calculation:</strong> Sum of word scores ÷ Number of tokens</li>
            <li><strong>Color coding:</strong> Green ≥ 0.5, Red ≤ -0.5, Orange = neutral</li>
            <li><strong>Note:</strong> Based on AFINN word list with manual ratings</li>
          </ul>
        </div>
      `;
    }
    
    if (analyzerLower.includes('vader')) {
      return `
        <div class="score-explanation">
          <strong>VADER Compound Score:</strong>
          <ul>
            <li><strong>Range:</strong> -1 to +1</li>
            <li><strong>Thresholds:</strong> ≥ 0.05 positive, ≤ -0.05 negative</li>
            <li><strong>Color coding:</strong> Matches VADER's built-in thresholds</li>
            <li><strong>Note:</strong> Optimized for social media text, handles emoticons & slang</li>
          </ul>
        </div>
      `;
    }
    
    // HuggingFace models
    return `
      <div class="score-explanation">
        <strong>HuggingFace Model Score:</strong>
        <ul>
          <li><strong>Range:</strong> -1 to +1 (converted from confidence)</li>
          <li><strong>Color coding:</strong> Green > 0.1, Red < -0.1, Orange = neutral</li>
          <li><strong>Note:</strong> Transformer-based neural network predictions</li>
        </ul>
      </div>
    `;
  }

  private getScoreColorClass(analyzer: string, score: number): string {
    const analyzerLower = analyzer.toLowerCase();
    
    // AFINN (using npm sentiment package) returns comparative score ranging -5 to +5
    if (analyzerLower.includes('afinn')) {
      if (score > 0.5) return 'score-positive';
      if (score < -0.5) return 'score-negative';
      return 'score-neutral';
    }
    
    // VADER compound score ranges -1 to +1, with thresholds at ±0.05
    if (analyzerLower.includes('vader')) {
      if (score >= 0.05) return 'score-positive';
      if (score <= -0.05) return 'score-negative';
      return 'score-neutral';
    }
    
    // HuggingFace models typically use -1 to +1 scale
    if (score > 0.1) return 'score-positive';
    if (score < -0.1) return 'score-negative';
    return 'score-neutral';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupScoreInfoToggles(): void {
    const toggles = this.container.querySelectorAll('.score-info-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const analyzer = toggle.getAttribute('data-analyzer');
        const detailsDiv = this.container.querySelector(`#info-${analyzer}`) as HTMLElement;
        
        if (detailsDiv) {
          if (detailsDiv.style.display === 'none') {
            detailsDiv.style.display = 'block';
            toggle.textContent = '[less]';
          } else {
            detailsDiv.style.display = 'none';
            toggle.textContent = '[more]';
          }
        }
      });
    });
  }

  clear(): void {
    this.container.innerHTML = '';
  }
}