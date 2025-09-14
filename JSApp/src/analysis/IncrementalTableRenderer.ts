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
          // Classification result - clickable to show all classes
          const allClassesJson = JSON.stringify(colResult.allClasses || {}).replace(/"/g, '&quot;');
          rowHtml += `
            <td class="score-cell classification-cell clickable"
                data-all-classes="${allClassesJson}"
                data-analyzer="${col.name}"
                data-line="${result.lineIndex + 1}"
                title="Click to see all class probabilities">
              <div class="classification-display">
                <span class="class-label">${colResult.topClass || 'N/A'}</span>
                <span class="confidence">${((colResult.confidence || 0) * 100).toFixed(1)}%</span>
                <span class="expand-icon">⊕</span>
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
      case 'positive': return '😃';
      case 'negative': return '😡';
      case 'neutral': return '<span class="neutral-emoji">😐</span>';
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

  /**
   * Show modal with all class probabilities
   */
  private showClassificationModal(cell: HTMLElement): void {
    const allClassesData = cell.getAttribute('data-all-classes');
    const analyzer = cell.getAttribute('data-analyzer');
    const line = cell.getAttribute('data-line');

    if (!allClassesData || !analyzer) return;

    try {
      const allClasses = JSON.parse(allClassesData.replace(/&quot;/g, '"'));

      // Sort classes by confidence (descending)
      const sortedClasses = Object.entries(allClasses)
        .sort((a, b) => (b[1] as number) - (a[1] as number));

      // Create modal content
      const modalHtml = `
        <div class="classification-modal-overlay" onclick="this.remove()">
          <div class="classification-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h3>${analyzer} - Line ${line}</h3>
              <button class="modal-close" onclick="this.closest('.classification-modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
              <div class="all-classes-list">
                ${sortedClasses.map(([className, confidence], index) => {
                  const percentage = ((confidence as number) * 100).toFixed(1);
                  const isTop = index === 0;
                  return `
                    <div class="class-item ${isTop ? 'top-class' : ''}">
                      <div class="class-info">
                        <span class="class-name">${className}</span>
                        <span class="class-percentage">${percentage}%</span>
                      </div>
                      <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${percentage}%"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      // Add modal to document
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer.firstElementChild as Element);

    } catch (error) {
      console.error('Failed to show classification modal:', error);
    }
  }

  /**
   * Initialize table with all text rows upfront, analysis cells as pending
   */
  initializeTableWithAllText(columns: UnifiedColumn[], texts: string[]): void {
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
            ${texts.map((text, index) => {
              const pendingCells = columns.map(() =>
                '<td class="score-cell pending"><span class="pending-dot">⋯</span></td>'
              ).join('');

              return `
                <tr class="result-row" data-line-index="${index}">
                  <td class="line-number-cell">
                    <span class="line-number">${index + 1}</span>
                  </td>
                  <td class="text-cell">
                    <div class="text-content">${this.escapeHtml(text)}</div>
                  </td>
                  ${pendingCells}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="table-status">
          <span class="status-text">Ready to analyze ${texts.length} lines...</span>
          <div class="pulse-indicator"></div>
        </div>
      </div>
    `;

    this.tbody = document.getElementById('results-tbody');
    this.currentRow = texts.length; // All rows are already created
  }

  /**
   * Update a specific cell with analysis result
   */
  updateAnalysisCell(lineIndex: number, columnName: string, result: any): void {
    if (!this.tbody) return;

    const row = this.tbody.querySelector(`tr[data-line-index="${lineIndex}"]`) as HTMLTableRowElement;
    if (!row) return;

    // Find column index
    const columnIndex = this.columns.findIndex(col => col.name === columnName);
    if (columnIndex === -1) return;

    // Cell index is +2 for line number and text columns
    const cellIndex = columnIndex + 2;
    const cell = row.cells[cellIndex];
    if (!cell) return;

    // Update cell content based on result type
    if (result.type === 'classification') {
      const allClassesJson = JSON.stringify(result.allClasses || {}).replace(/"/g, '&quot;');
      cell.innerHTML = `
        <div class="classification-display clickable"
             data-all-classes="${allClassesJson}"
             data-analyzer="${columnName}"
             data-line="${lineIndex + 1}"
             title="Click to see all class probabilities">
          <span class="class-label">${result.topClass || 'N/A'}</span>
          <span class="confidence">${((result.confidence || 0) * 100).toFixed(1)}%</span>
          <span class="expand-icon">⊕</span>
        </div>
      `;
      cell.className = 'score-cell classification-cell clickable';

      // Add click handler
      const display = cell.querySelector('.classification-display');
      if (display) {
        display.addEventListener('click', (e) => {
          e.preventDefault();
          this.showClassificationModal(display as HTMLElement);
        });
      }
    } else {
      // Sentiment result
      const colorClass = this.getScoreColorClass(result.sentiment || 'neutral', result.score || 0);
      const icon = this.getSentimentIcon(result.sentiment || 'neutral');
      cell.innerHTML = `
        <div class="score-display ${colorClass}">
          <span class="sentiment-icon">${icon}</span>
          <span class="score-value">${(result.score || 0).toFixed(3)}</span>
        </div>
      `;
      cell.className = 'score-cell';
    }

    // Add update animation
    cell.classList.add('cell-update');
    setTimeout(() => cell.classList.remove('cell-update'), 300);
  }

  /**
   * Update progress for the new approach
   */
  updateAnalysisProgress(status: string, completed: number, total: number): void {
    this.updateStatus(`${status} (${completed}/${total} complete)`);
  }

  /**
   * Show download confirmation dialog for ML models
   */
  static async showDownloadConfirmation(models: Array<{name: string, size: number, huggingFaceId: string, cached: boolean}>): Promise<boolean> {
    return new Promise((resolve) => {
      // Separate cached and non-cached models
      const cachedModels = models.filter(m => m.cached);
      const modelsToDownload = models.filter(m => !m.cached);
      const downloadSize = modelsToDownload.reduce((sum, model) => sum + model.size, 0);
      const totalSize = models.reduce((sum, model) => sum + model.size, 0);

      const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024 * 1024) {
          return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        }
        return `${Math.round(bytes / (1024 * 1024))} MB`;
      };

      // If everything is cached, show different dialog
      if (downloadSize === 0) {
        const modalHtml = `
          <div class="download-confirmation-overlay" onclick="event.target === this && this.remove()">
            <div class="download-confirmation-modal compact" onclick="event.stopPropagation()">
              <div class="modal-header compact cached">
                <h3>✅ All Models Cached - ${formatSize(totalSize)}</h3>
                <button class="modal-close" onclick="this.closest('.download-confirmation-overlay').remove(); arguments[0].resolve(true);">×</button>
              </div>
              <div class="modal-body compact">
                <div class="models-table">
                  ${models.map(model => `
                    <div class="model-row">
                      <span class="model-name">✅ ${model.name}</span>
                      <span class="model-size-badge cached">${formatSize(model.size)}</span>
                    </div>
                  `).join('')}
                </div>
                <div class="total-size cached">
                  <strong>All models ready instantly!</strong>
                  <span class="download-note">No download required</span>
                </div>
              </div>
              <div class="modal-footer compact">
                <button class="btn btn-primary download-btn">🚀 Start Analysis</button>
              </div>
            </div>
          </div>
        `;

        // Add modal and set up handlers (simplified for cached case)
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        const modal = modalContainer.firstElementChild as HTMLElement;

        const downloadBtn = modal.querySelector('.download-btn') as HTMLButtonElement;
        downloadBtn.onclick = () => {
          modal.remove();
          resolve(true);
        };

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            modal.remove();
            resolve(false);
          }
        });

        document.body.appendChild(modal);
        setTimeout(() => downloadBtn.focus(), 100);
        return;
      }

      const modalHtml = `
        <div class="download-confirmation-overlay" onclick="event.target === this && this.remove()">
          <div class="download-confirmation-modal compact" onclick="event.stopPropagation()">
            <div class="modal-header compact">
              <h3>📥 Download Required - ${formatSize(downloadSize)}</h3>
              <button class="modal-close" onclick="this.closest('.download-confirmation-overlay').remove(); arguments[0].resolve(false);">×</button>
            </div>
            <div class="modal-body compact">
              <div class="models-table">
                ${(() => {
                  let html = '';

                  // Show cached models first (if any)
                  if (cachedModels.length > 0) {
                    html += '<div class="model-group-header">✅ Cached Models</div>';
                    html += cachedModels.map(model => `
                      <div class="model-row">
                        <span class="model-name">✅ ${model.name}</span>
                        <span class="model-size-badge cached">${formatSize(model.size)}</span>
                      </div>
                    `).join('');
                  }

                  // Show models to download
                  if (modelsToDownload.length > 0) {
                    html += '<div class="model-group-header">📥 To Download</div>';
                    html += modelsToDownload.map(model => `
                      <div class="model-row">
                        <span class="model-name">${model.name}</span>
                        <span class="model-size-badge ${model.huggingFaceId.startsWith('Rule-based') ? 'rule-based' : 'neural'}">${formatSize(model.size)}</span>
                      </div>
                    `).join('');
                  }

                  return html;
                })()}
              </div>
              <div class="total-size">
                <strong>Download: ${formatSize(downloadSize)}</strong>
                <span class="download-note">
                  ${cachedModels.length > 0 ? `${cachedModels.length} model${cachedModels.length > 1 ? 's' : ''} already cached` :
                    downloadSize > 1024 * 1024 * 1024 ? '⚠️ Large download' : '💡 Cached after first download'}
                </span>
              </div>
            </div>
            <div class="modal-footer compact">
              <button class="btn btn-secondary cancel-btn">Cancel</button>
              <button class="btn btn-primary download-btn">📥 Download & Analyze</button>
            </div>
          </div>
        </div>
      `;

      // Add modal to document
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      const modal = modalContainer.firstElementChild as HTMLElement;

      // Set up event handlers
      const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;
      const downloadBtn = modal.querySelector('.download-btn') as HTMLButtonElement;

      cancelBtn.onclick = () => {
        modal.remove();
        resolve(false);
      };

      downloadBtn.onclick = () => {
        modal.remove();
        resolve(true);
      };

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.body.appendChild(modal);

      // Focus the download button
      setTimeout(() => downloadBtn.focus(), 100);
    });
  }

  /**
   * Initialize modal CSS (call once on page load)
   */
  static initializeModalStyles(): void {
    if (document.getElementById('classification-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'classification-modal-styles';
    styles.textContent = `
      .classification-cell.clickable {
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .classification-cell.clickable:hover {
        background-color: #f0f8ff;
      }

      .expand-icon {
        margin-left: 8px;
        opacity: 0.7;
        font-size: 12px;
      }

      .classification-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }

      .classification-modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        animation: slideIn 0.3s ease;
      }

      .modal-header {
        background: #2c3e50;
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }

      .modal-close:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }

      .modal-body {
        padding: 20px;
        max-height: calc(80vh - 80px);
        overflow-y: auto;
      }

      .all-classes-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .class-item {
        border: 1px solid #e0e6ed;
        border-radius: 6px;
        padding: 12px;
        transition: border-color 0.2s ease;
      }

      .class-item.top-class {
        border-color: #3498db;
        background-color: #f8fbff;
      }

      .class-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .class-name {
        font-weight: 600;
        color: #2c3e50;
      }

      .class-percentage {
        color: #7f8c8d;
        font-family: monospace;
        font-weight: bold;
      }

      .confidence-bar {
        height: 8px;
        background-color: #ecf0f1;
        border-radius: 4px;
        overflow: hidden;
      }

      .confidence-fill {
        height: 100%;
        background: linear-gradient(90deg, #3498db, #2980b9);
        transition: width 0.3s ease;
      }

      .class-item.top-class .confidence-fill {
        background: linear-gradient(90deg, #27ae60, #229954);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideIn {
        from { transform: translateY(-20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      .cell-update {
        animation: cellUpdateFlash 0.3s ease;
      }

      @keyframes cellUpdateFlash {
        0% { background-color: rgba(52, 152, 219, 0.3); }
        100% { background-color: transparent; }
      }

      /* Download Confirmation Modal Styles */
      .download-confirmation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 15000;
        animation: fadeIn 0.2s ease;
      }

      .download-confirmation-modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        max-width: 500px;
        width: 90%;
        animation: slideIn 0.3s ease;
      }

      .download-confirmation-modal.compact {
        max-width: 450px;
      }

      .download-confirmation-modal .modal-header {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .download-confirmation-modal .modal-header.compact {
        padding: 10px 16px;
      }

      .download-confirmation-modal .modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .download-confirmation-modal .modal-body {
        padding: 16px;
      }

      .download-confirmation-modal .modal-body.compact {
        padding: 12px 16px;
      }

      .models-table {
        margin-bottom: 12px;
      }

      .model-group-header {
        font-weight: 600;
        color: #2c3e50;
        font-size: 13px;
        margin: 8px 0 4px 0;
        border-bottom: 1px solid #e9ecef;
        padding-bottom: 2px;
      }

      .model-group-header:first-child {
        margin-top: 0;
      }

      .model-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 3px 0;
        font-size: 13px;
      }

      .model-name {
        color: #2c3e50;
        flex-grow: 1;
      }

      .model-size-badge {
        color: white;
        padding: 1px 6px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        min-width: 40px;
        text-align: center;
      }

      .model-size-badge.rule-based {
        background: #27ae60;
      }

      .model-size-badge.neural {
        background: #e74c3c;
      }

      .model-size-badge.cached {
        background: #28a745;
      }

      .modal-header.cached {
        background: linear-gradient(135deg, #28a745, #20c997);
      }

      .total-size.cached {
        border-top: 2px solid #28a745;
      }

      .total-size {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
        border-top: 2px solid #3498db;
      }

      .total-size strong {
        color: #2c3e50;
        font-size: 14px;
      }

      .download-note {
        color: #6c757d;
        font-size: 11px;
        font-style: italic;
      }

      .modal-footer {
        padding: 12px 16px;
        background: #f8f9fa;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        border-top: 1px solid #e9ecef;
      }

      .modal-footer.compact {
        padding: 8px 16px;
      }

      .modal-footer .btn {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
      }

      .modal-footer .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .modal-footer .btn-secondary:hover {
        background: #5a6268;
      }

      .modal-footer .btn-primary {
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
      }

      .modal-footer .btn-primary:hover {
        background: linear-gradient(135deg, #218838, #1fa080);
      }

      .download-icon {
        margin-right: 8px;
      }

      .model-group-section {
        margin-bottom: 20px;
      }

      .model-group-section h5 {
        margin: 0 0 12px 0;
        color: #2c3e50;
        font-weight: 600;
        font-size: 16px;
        padding-bottom: 6px;
        border-bottom: 2px solid #ecf0f1;
      }

      .model-size.rule-based {
        background: #27ae60;
      }

      .model-size.neural {
        background: #e74c3c;
      }
    `;
    document.head.appendChild(styles);
  }
}