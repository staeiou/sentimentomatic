import { SentimentResult, ClassificationResult } from './AnalysisStrategy';

interface UnifiedColumn {
  name: string;
  type: 'sentiment' | 'classification';
  modelId?: string;
}

interface UnifiedResult {
  lineIndex: number;
  text: string;
  results: Array<{
    analyzer: string;
    type: 'sentiment' | 'classification';
    // For sentiment
    score?: number;
    sentiment?: string;
    // For classification
    topClass?: string;
    confidence?: number;
    allClasses?: {[key: string]: number};
    metadata?: any;
  }>;
}

export class IncrementalTableRenderer {
  private container: HTMLElement;
  private tbody: HTMLElement | null = null;
  private columns: UnifiedColumn[] = [];
  private currentRow = 0;
  // private animationDelay = 50; // ms between row additions - reserved for future use
  
  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Initialize table structure for sentiment analysis
   */
  initializeSentimentTable(analyzers: string[]): void {
    // Convert to columns for compatibility
    this.columns = analyzers.map(name => ({ name, type: 'sentiment' as const }));
    
    this.container.innerHTML = `
      <div class="incremental-table-container">
        <table class="results-table sentiment-table">
          <thead>
            <tr>
              <th class="line-number-col">
                <span class="header-icon">#</span>
              </th>
              <th class="text-col">
                <span class="header-icon">📝</span>
                Text
              </th>
              ${analyzers.map(analyzer => {
                const icon = this.getAnalyzerIcon(analyzer);
                const range = this.getAnalyzerRange(analyzer);
                return `
                  <th class="score-col analyzer-${analyzer.toLowerCase().replace(/\s+/g, '-')}">
                    <div class="analyzer-header">
                      <span class="analyzer-icon">${icon}</span>
                      <span class="analyzer-name">${analyzer}</span>
                      <span class="analyzer-range">${range}</span>
                    </div>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody id="results-tbody">
            <!-- Rows will be added incrementally here -->
          </tbody>
        </table>
        <div class="table-status">
          <span class="status-text">Analyzing...</span>
          <div class="pulse-indicator"></div>
        </div>
      </div>
    `;
    
    this.tbody = document.getElementById('results-tbody');
    this.currentRow = 0;
  }

  /**
   * Initialize table structure for classification
   */
  initializeClassificationTable(modelName: string, classes: string[]): void {
    // Show limited number of classes to avoid overwhelming the table
    const displayClasses = classes.slice(0, 5);
    const hasMore = classes.length > 5;
    
    this.container.innerHTML = `
      <div class="incremental-table-container">
        <div class="classification-header">
          <h3>${modelName}</h3>
          <p class="model-subtitle">Showing top predictions for ${classes.length} classes</p>
        </div>
        <table class="results-table classification-table">
          <thead>
            <tr>
              <th class="line-number-col">#</th>
              <th class="text-col">Text</th>
              <th class="prediction-col">
                <span class="header-icon">🎯</span>
                Top Prediction
              </th>
              <th class="confidence-col">
                <span class="header-icon">📊</span>
                Confidence
              </th>
              ${displayClasses.map(className => `
                <th class="class-score-col">${className}</th>
              `).join('')}
              ${hasMore ? '<th class="more-col">...</th>' : ''}
            </tr>
          </thead>
          <tbody id="results-tbody">
            <!-- Rows will be added incrementally here -->
          </tbody>
        </table>
        <div class="table-status">
          <span class="status-text">Classifying...</span>
          <div class="pulse-indicator"></div>
        </div>
      </div>
    `;
    
    this.tbody = document.getElementById('results-tbody');
    this.currentRow = 0;
  }

  /**
   * Add a sentiment result row with animation
   */
  async addSentimentRow(result: SentimentResult): Promise<void> {
    if (!this.tbody) return;
    
    const row = document.createElement('tr');
    row.className = 'result-row fade-in';
    row.style.animationDelay = `${this.currentRow * 30}ms`;
    
    // Build row content using columns
    const analyzerList = this.columns.map(col => col.name);
    
    row.innerHTML = `
      <td class="line-number-cell">
        <span class="line-number">${result.lineIndex + 1}</span>
      </td>
      <td class="text-cell">
        <div class="text-content">${this.escapeHtml(result.text)}</div>
      </td>
      ${analyzerList.map(analyzer => {
        const analyzerResult = result.results.find(r => r.analyzer === analyzer);
        if (analyzerResult) {
          return this.createScoreCell(analyzerResult);
        } else {
          return '<td class="score-cell pending"><span class="pending-dot">⋯</span></td>';
        }
      }).join('')}
    `;
    
    this.tbody.appendChild(row);
    this.currentRow++;
    
    // Trigger reflow to ensure animation plays
    row.offsetHeight;
    row.classList.add('visible');
    
    // Auto-scroll viewport to show the new row at the bottom
    requestAnimationFrame(() => {
      // Scroll to the absolute bottom
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    });
    
    // Update status
    this.updateStatus(`Analyzed ${this.currentRow} lines`);
  }

  /**
   * Add a classification result row
   */
  async addClassificationRow(result: ClassificationResult): Promise<void> {
    if (!this.tbody) return;
    
    const row = document.createElement('tr');
    row.className = 'result-row fade-in';
    
    // Get top 5 classes for display
    const sortedClasses = Object.entries(result.allClasses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    row.innerHTML = `
      <td class="line-number-cell">${result.lineIndex + 1}</td>
      <td class="text-cell">
        <div class="text-content">${this.escapeHtml(result.text)}</div>
      </td>
      <td class="prediction-cell">
        <span class="prediction-label ${this.getClassColor(result.topClass)}">${result.topClass}</span>
      </td>
      <td class="confidence-cell">
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${result.confidence * 100}%"></div>
          <span class="confidence-value">${(result.confidence * 100).toFixed(1)}%</span>
        </div>
      </td>
      ${sortedClasses.map(([, score]) => `
        <td class="class-score-cell">
          <div class="mini-bar" style="--score: ${score}">
            <span class="score-text">${(score * 100).toFixed(0)}%</span>
          </div>
        </td>
      `).join('')}
    `;
    
    this.tbody.appendChild(row);
    this.currentRow++;
    
    // Trigger animation
    row.offsetHeight;
    row.classList.add('visible');
  }

  /**
   * Update a specific cell in an existing row
   */
  updateSentimentCell(lineIndex: number, analyzerName: string, result: any): void {
    if (!this.tbody) return;
    
    const row = this.tbody.children[lineIndex] as HTMLTableRowElement;
    if (!row) return;
    
    const analyzerList = this.columns.map(col => col.name);
    const cellIndex = analyzerList.indexOf(analyzerName) + 2; // +2 for line number and text columns
    
    const cell = row.cells[cellIndex];
    if (cell) {
      cell.innerHTML = this.createScoreCellContent(result);
      cell.classList.add('cell-update');
      setTimeout(() => cell.classList.remove('cell-update'), 300);
    }
  }

  /**
   * Mark analysis as complete
   */
  complete(): void {
    const statusElement = this.container.querySelector('.table-status');
    if (statusElement) {
      statusElement.innerHTML = `
        <span class="status-text complete">
          <span class="check-icon">✓</span>
          Analysis complete - ${this.currentRow} lines processed
        </span>
      `;
    }
  }

  /**
   * Initialize unified table that can handle both sentiment and classification columns
   */
  initializeUnifiedTable(columns: UnifiedColumn[]): void {
    this.columns = columns;
    
    this.container.innerHTML = `
      <div class="incremental-table-container">
        <table class="results-table unified-table">
          <thead>
            <tr>
              <th class="line-number-col">
                <span class="header-icon">#</span>
              </th>
              <th class="text-col">
                <span class="header-icon">📝</span>
                Text
              </th>
              ${columns.map(col => {
                const icon = this.getColumnIcon(col);
                const typeClass = col.type === 'classification' ? 'classification-col' : 'sentiment-col';
                return `
                  <th class="score-col ${typeClass} analyzer-${col.name.toLowerCase().replace(/\s+/g, '-')}">
                    <div class="analyzer-header">
                      <span class="analyzer-icon">${icon}</span>
                      <span class="analyzer-name">${col.name}</span>
                    </div>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody id="results-tbody">
            <!-- Rows will be added incrementally here -->
          </tbody>
        </table>
        <div class="table-status">
          <span class="status-text">Analyzing...</span>
          <div class="pulse-indicator"></div>
        </div>
      </div>
    `;
    
    this.tbody = document.getElementById('results-tbody');
    this.currentRow = 0;
  }

  /**
   * Add a unified row with mixed sentiment and classification results
   */
  async addUnifiedRow(result: UnifiedResult): Promise<void> {
    if (!this.tbody) return;
    
    const row = document.createElement('tr');
    row.className = 'result-row fade-in';
    row.style.animationDelay = `${this.currentRow * 30}ms`;
    
    // Build row content
    let rowHtml = `
      <td class="line-number-cell">
        <span class="line-number">${result.lineIndex + 1}</span>
      </td>
      <td class="text-cell">
        <div class="text-content">${this.escapeHtml(result.text)}</div>
      </td>
    `;
    
    // Add cells for each column
    for (const col of this.columns) {
      const colResult = result.results.find(r => r.analyzer === col.name);
      
      if (colResult) {
        if (colResult.type === 'classification') {
          // Classification result
          rowHtml += `
            <td class="score-cell classification-cell">
              <div class="classification-display">
                <span class="class-label">${colResult.topClass || 'N/A'}</span>
                <span class="confidence">${((colResult.confidence || 0) * 100).toFixed(1)}%</span>
              </div>
            </td>
          `;
        } else {
          // Sentiment result
          const colorClass = this.getScoreColorClass(colResult.sentiment || 'neutral', colResult.score || 0);
          const icon = this.getSentimentIcon(colResult.sentiment || 'neutral');
          rowHtml += `
            <td class="score-cell">
              <div class="score-display ${colorClass}">
                <span class="sentiment-icon">${icon}</span>
                <span class="score-value">${(colResult.score || 0).toFixed(3)}</span>
              </div>
            </td>
          `;
        }
      } else {
        // No result for this column yet
        rowHtml += '<td class="score-cell pending"><span class="pending-dot">⋯</span></td>';
      }
    }
    
    row.innerHTML = rowHtml;
    this.tbody.appendChild(row);
    this.currentRow++;
    
    // Trigger reflow to ensure animation plays
    row.offsetHeight;
    row.classList.add('visible');
    
    // Auto-scroll viewport to show the new row at the bottom
    requestAnimationFrame(() => {
      // Scroll to the absolute bottom
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    });
    
    // Update status
    this.updateStatus(`Analyzed ${this.currentRow} lines`);
  }

  /**
   * Get icon for a column based on type and name
   */
  private getColumnIcon(col: UnifiedColumn): string {
    const name = col.name.toLowerCase();
    if (name.includes('afinn')) return '📊';
    if (name.includes('vader')) return '🎭';
    if (name.includes('emotion')) return '😊';
    if (name.includes('koala') || name.includes('moderation')) return '🛡️';
    if (name.includes('iptc') || name.includes('news')) return '📰';
    if (name.includes('covid')) return '🦠';
    if (name.includes('imdb')) return '🎬';
    if (name.includes('bert')) return '🤖';
    if (name.includes('roberta')) return '🧠';
    return col.type === 'classification' ? '🏷️' : '🔬';
  }

  /**
   * Update status text
   */
  private updateStatus(text: string): void {
    const statusText = this.container.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = text;
    }
  }

  /**
   * Create score cell HTML
   */
  private createScoreCell(result: any): string {
    return `<td class="score-cell">${this.createScoreCellContent(result)}</td>`;
  }

  /**
   * Create score cell content
   */
  private createScoreCellContent(result: any): string {
    const colorClass = this.getScoreColorClass(result.sentiment, result.score);
    const icon = this.getSentimentIcon(result.sentiment);
    
    return `
      <div class="score-display ${colorClass}">
        <span class="sentiment-icon">${icon}</span>
        <span class="score-value">${result.score.toFixed(3)}</span>
        <div class="score-bar">
          <div class="score-bar-fill" style="width: ${Math.abs(result.score) * 50}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Helper methods
   */
  private getAnalyzerIcon(analyzer: string): string {
    const lowerAnalyzer = analyzer.toLowerCase();
    if (lowerAnalyzer.includes('afinn')) return '📊';
    if (lowerAnalyzer.includes('vader')) return '🎭';
    if (lowerAnalyzer.includes('bert')) return '🤖';
    if (lowerAnalyzer.includes('roberta')) return '🧠';
    return '🔬';
  }

  private getAnalyzerRange(analyzer: string): string {
    const lowerAnalyzer = analyzer.toLowerCase();
    if (lowerAnalyzer.includes('afinn')) return '(-5 to +5)';
    if (lowerAnalyzer.includes('vader')) return '(-1 to +1)';
    return '(-1 to +1)';
  }

  private getSentimentIcon(sentiment: string): string {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      case 'neutral': return '😐';
      default: return '❓';
    }
  }

  private getScoreColorClass(sentiment: string, score: number): string {
    if (sentiment === 'positive' || score > 0.1) return 'positive';
    if (sentiment === 'negative' || score < -0.1) return 'negative';
    return 'neutral';
  }

  private getClassColor(className: string): string {
    // Color coding for common classification labels
    const lower = className.toLowerCase();
    if (lower.includes('positive') || lower.includes('joy')) return 'positive';
    if (lower.includes('negative') || lower.includes('anger')) return 'negative';
    if (lower.includes('neutral')) return 'neutral';
    if (lower.includes('toxic')) return 'toxic';
    return 'default';
  }

  // Removed truncateText - we now show full text

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}