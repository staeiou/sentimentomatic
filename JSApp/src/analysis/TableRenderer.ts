import { AnalysisResult, SentimentResult, ClassificationResult } from './AnalysisStrategy.js';

export interface TableRenderer {
  render(result: AnalysisResult, container: HTMLElement): void;
}

export class SentimentTableRenderer implements TableRenderer {
  render(result: AnalysisResult, container: HTMLElement): void {
    if (result.type !== 'sentiment') {
      throw new Error('SentimentTableRenderer can only render sentiment results');
    }

    const sentimentData = result.data as SentimentResult[];
    
    // Get all unique analyzers
    const analyzers = new Set<string>();
    sentimentData.forEach(line => {
      line.results.forEach(r => analyzers.add(r.analyzer));
    });
    const analyzerList = Array.from(analyzers);

    // Build table
    container.innerHTML = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Line</th>
            <th>Text</th>
            ${analyzerList.map(analyzer => `<th>${analyzer}<br><small>(-1 to +1)</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${sentimentData.map(line => `
            <tr>
              <td>${line.lineIndex + 1}</td>
              <td class="text-cell">${this.escapeHtml(line.text)}</td>
              ${analyzerList.map(analyzer => {
                const result = line.results.find(r => r.analyzer === analyzer);
                if (result) {
                  const colorClass = this.getScoreColorClass(result.score);
                  return `<td class="score-cell ${colorClass}">${result.score.toFixed(3)}</td>`;
                } else {
                  return '<td class="error-cell">-</td>';
                }
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getScoreColorClass(score: number): string {
    if (score >= 0.5) return 'positive';
    if (score <= -0.5) return 'negative';
    return 'neutral';
  }
}

export class ClassificationTableRenderer implements TableRenderer {
  render(result: AnalysisResult, container: HTMLElement): void {
    if (result.type !== 'classification') {
      throw new Error('ClassificationTableRenderer can only render classification results');
    }

    const classificationData = result.data as ClassificationResult[];
    
    if (classificationData.length === 0) {
      container.innerHTML = '<p>No classification results</p>';
      return;
    }

    // Get all unique classes from all lines
    const allClasses = new Set<string>();
    classificationData.forEach(line => {
      Object.keys(line.allClasses).forEach(className => allClasses.add(className));
    });
    const classList = Array.from(allClasses).sort();

    const modelName = classificationData[0].model;

    // Build table with all classes as columns
    container.innerHTML = `
      <div class="classification-header">
        <h3>${modelName} - All Class Probabilities</h3>
        <p>Showing confidence scores for all ${classList.length} classes</p>
      </div>
      <table class="results-table classification-table">
        <thead>
          <tr>
            <th>Line</th>
            <th>Text</th>
            <th>Top Class</th>
            ${classList.map(className => `<th>${className}<br><small>(0-1)</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${classificationData.map(line => `
            <tr>
              <td>${line.lineIndex + 1}</td>
              <td class="text-cell">${this.escapeHtml(line.text)}</td>
              <td class="top-class"><strong>${line.topClass}</strong><br><small>${line.confidence.toFixed(3)}</small></td>
              ${classList.map(className => {
                const score = line.allClasses[className] || 0;
                const isTopClass = className === line.topClass;
                const colorClass = this.getClassificationColorClass(score, isTopClass);
                return `<td class="score-cell ${colorClass}">${score.toFixed(3)}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getClassificationColorClass(score: number, isTopClass: boolean): string {
    if (isTopClass) return 'top-class';
    if (score >= 0.5) return 'high-confidence';
    if (score >= 0.1) return 'medium-confidence';
    return 'low-confidence';
  }
}