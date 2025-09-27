// Type declarations for external libraries
declare global {
  interface Window {
    Papa: any;
    XLSX: any;
  }
}

export interface ColumnInfo {
  name: string;
  index: number;
  sampleValues: string[];
  dataType: 'text' | 'number' | 'date' | 'mixed';
  textScore: number; // 0-1 confidence this is text data
  icon: string; // 📝🔢📅
  rowCount: number;
}

export interface ParsedFileData {
  fileName: string;
  fileSize: number;
  totalRows: number;
  columns: ColumnInfo[];
  rawData: any[][];
}

export interface ImportOptions {
  mode: 'replace' | 'append';
  selectedColumnIndex: number;
}

export class FileImporter {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_ROWS = 5000;
  private static readonly PREVIEW_ROWS = 5;

  private currentFileData: ParsedFileData | null = null;
  private onDataImported: (data: string) => void;

  constructor(onDataImported: (data: string) => void) {
    this.onDataImported = onDataImported;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // File upload zone
    const uploadZone = document.getElementById('file-upload-zone');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    if (uploadZone && fileInput) {
      // Click to upload
      uploadZone.addEventListener('click', () => {
        fileInput.click();
      });

      // File selection
      fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          this.handleFileUpload(target.files[0]);
        }
      });

      // Drag and drop
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
      });

      uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
      });

      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');

        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    // Column selection handlers
    const backBtn = document.getElementById('column-selection-back');
    const importBtn = document.getElementById('column-selection-import');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showFileUploadModal();
      });
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this.performImport();
      });
    }

    // Add event listener for newlines checkbox to update preview
    const removeNewlinesCheckbox = document.getElementById('remove-newlines');
    if (removeNewlinesCheckbox) {
      removeNewlinesCheckbox.addEventListener('change', () => {
        // Update preview if a column is currently selected
        const selectedRadio = document.querySelector('input[name="column-selection"]:checked') as HTMLInputElement;
        if (selectedRadio) {
          const columnIndex = parseInt(selectedRadio.value);
          this.updatePreview(columnIndex);
        }
      });
    }
  }

  public showFileUploadModal(): void {
    // Hide column selection modal
    const columnModal = document.getElementById('column-selection-modal');
    if (columnModal) {
      columnModal.style.display = 'none';
    }

    // Show file upload modal
    const uploadModal = document.getElementById('file-upload-modal');
    if (uploadModal) {
      uploadModal.style.display = 'flex';

      // Reset progress and file input
      this.resetUploadProgress();
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }

  private async handleFileUpload(file: File): Promise<void> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Show progress
      this.showUploadProgress();

      // Parse file based on type
      const fileData = await this.parseFile(file);

      // Analyze columns
      fileData.columns = this.analyzeColumns(fileData.rawData);

      // Store data and show column selection
      this.currentFileData = fileData;
      this.showColumnSelectionModal();

    } catch (error) {
      console.error('File upload error:', error);
      alert(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.hideUploadProgress();
    }
  }

  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > FileImporter.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large (${this.formatFileSize(file.size)}). Maximum is ${this.formatFileSize(FileImporter.MAX_FILE_SIZE)}.`
      };
    }

    // Check file type
    const allowedTypes = ['.csv', '.tsv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().split('.').pop();

    if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
      return {
        valid: false,
        error: 'Unsupported file format. Please use CSV, TSV, or Excel files.'
      };
    }

    return { valid: true };
  }

  private async parseFile(file: File): Promise<ParsedFileData> {
    const extension = file.name.toLowerCase().split('.').pop();

    if (extension === 'csv' || extension === 'tsv') {
      return this.parseCSV(file, extension === 'tsv' ? '\t' : ',');
    } else if (extension === 'xlsx' || extension === 'xls') {
      return this.parseExcel(file);
    } else {
      throw new Error('Unsupported file format');
    }
  }

  private async parseCSV(file: File, delimiter: string): Promise<ParsedFileData> {
    return new Promise((resolve, reject) => {
      window.Papa.parse(file, {
        delimiter: delimiter,
        header: false,
        skipEmptyLines: true,
        complete: (results: any) => {
          try {
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }

            const rawData = results.data as any[][];

            // Limit rows
            const limitedData = rawData.slice(0, FileImporter.MAX_ROWS + 1); // +1 for header

            if (rawData.length > FileImporter.MAX_ROWS + 1) {
              console.warn(`File truncated to ${FileImporter.MAX_ROWS} rows`);
            }

            resolve({
              fileName: file.name,
              fileSize: file.size,
              totalRows: limitedData.length - 1, // Subtract header
              columns: [], // Will be filled by analyzeColumns
              rawData: limitedData
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error: any) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }

  private async parseExcel(file: File): Promise<ParsedFileData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = window.XLSX.read(data, { type: 'array' });

          // Use first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to array of arrays
          const rawData = window.XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false
          }) as any[][];

          // Remove empty rows
          const filteredData = rawData.filter(row =>
            row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '')
          );

          // Limit rows
          const limitedData = filteredData.slice(0, FileImporter.MAX_ROWS + 1);

          if (filteredData.length > FileImporter.MAX_ROWS + 1) {
            console.warn(`File truncated to ${FileImporter.MAX_ROWS} rows`);
          }

          resolve({
            fileName: file.name,
            fileSize: file.size,
            totalRows: limitedData.length - 1,
            columns: [],
            rawData: limitedData
          });
        } catch (error) {
          reject(new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private analyzeColumns(rawData: any[][]): ColumnInfo[] {
    if (rawData.length < 2) {
      throw new Error('File must have at least one header row and one data row');
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    const columns: ColumnInfo[] = [];

    for (let i = 0; i < headers.length; i++) {
      const columnName = headers[i] || `Column ${i + 1}`;
      const columnValues = dataRows.map(row => row[i] || '').slice(0, 20); // Sample first 20 values

      const analysis = this.analyzeColumnData(columnValues, columnName);

      columns.push({
        name: columnName,
        index: i,
        sampleValues: columnValues.slice(0, 3), // First 3 for display
        dataType: analysis.dataType,
        textScore: analysis.textScore,
        icon: analysis.icon,
        rowCount: dataRows.length
      });
    }

    return columns.sort((a, b) => b.textScore - a.textScore); // Sort by text likelihood
  }

  private analyzeColumnData(values: any[], columnName: string): {
    dataType: 'text' | 'number' | 'date' | 'mixed';
    textScore: number;
    icon: string;
  } {
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v.toString().trim() !== '');

    if (nonEmptyValues.length === 0) {
      return { dataType: 'mixed', textScore: 0, icon: '❓' };
    }

    let textScore = 0;
    let numberCount = 0;
    let dateCount = 0;
    let textCount = 0;

    // Analyze each value
    for (const value of nonEmptyValues) {
      const str = value.toString().trim();

      // Check if it's a number
      if (!isNaN(Number(str)) && str !== '') {
        numberCount++;
        continue;
      }

      // Check if it's a date
      const dateVal = new Date(str);
      if (!isNaN(dateVal.getTime()) && str.length > 6) {
        dateCount++;
        continue;
      }

      // It's text
      textCount++;

      // Score text quality
      if (str.length > 10) textScore += 0.3; // Longer text gets more points
      if (str.includes(' ')) textScore += 0.2; // Spaces indicate sentences
      if (/[.!?]/.test(str)) textScore += 0.2; // Punctuation indicates text
      if (str.length > 30) textScore += 0.3; // Very long text gets bonus
    }

    // Name-based bonus for text columns
    const lowerName = columnName.toLowerCase();
    const textKeywords = ['comment', 'text', 'feedback', 'review', 'description', 'message', 'content', 'note'];
    if (textKeywords.some(keyword => lowerName.includes(keyword))) {
      textScore += 0.5;
    }

    // Determine primary type
    const total = nonEmptyValues.length;
    const textRatio = textCount / total;
    const numberRatio = numberCount / total;
    const dateRatio = dateCount / total;

    let dataType: 'text' | 'number' | 'date' | 'mixed';
    let icon: string;

    if (textRatio > 0.7) {
      dataType = 'text';
      icon = '📝';
      textScore += textRatio;
    } else if (numberRatio > 0.8) {
      dataType = 'number';
      icon = '🔢';
      textScore *= 0.1; // Very low score for pure numbers
    } else if (dateRatio > 0.6) {
      dataType = 'date';
      icon = '📅';
      textScore *= 0.2; // Low score for dates
    } else {
      dataType = 'mixed';
      icon = '🔀';
      textScore += textRatio * 0.5; // Partial score for mixed content
    }

    return {
      dataType,
      textScore: Math.min(textScore, 1), // Cap at 1
      icon
    };
  }

  private showColumnSelectionModal(): void {
    if (!this.currentFileData) return;

    // Hide upload modal
    const uploadModal = document.getElementById('file-upload-modal');
    if (uploadModal) {
      uploadModal.style.display = 'none';
    }

    // Show column selection modal
    const columnModal = document.getElementById('column-selection-modal');
    if (columnModal) {
      columnModal.style.display = 'flex';

      // Populate file info
      this.populateFileInfo();

      // Populate columns
      this.populateColumnsList();

      // Auto-select best text column
      this.autoSelectBestColumn();
    }
  }

  private populateFileInfo(): void {
    if (!this.currentFileData) return;

    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
      fileInfo.innerHTML = `
        <strong>File:</strong> ${this.currentFileData.fileName}
        (${this.formatFileSize(this.currentFileData.fileSize)}, ${this.currentFileData.totalRows.toLocaleString()} rows)
      `;
    }
  }

  private populateColumnsList(): void {
    if (!this.currentFileData) return;

    const columnsList = document.getElementById('columns-list');
    if (!columnsList) return;

    columnsList.innerHTML = '';

    this.currentFileData.columns.forEach((column) => {
      const columnDiv = document.createElement('div');
      columnDiv.className = 'column-option';

      const sampleText = column.sampleValues
        .filter(v => v && v.toString().trim() !== '')
        .slice(0, 2)
        .map(v => `"${v.toString().slice(0, 30)}${v.toString().length > 30 ? '...' : ''}"`)
        .join(', ');

      columnDiv.innerHTML = `
        <input type="radio" name="column-selection" value="${column.index}" class="column-radio" id="column-${column.index}">
        <div class="column-info">
          <div>
            <div class="column-name">${column.name}</div>
            <div class="column-sample">${sampleText || 'No preview available'}</div>
          </div>
          <div class="column-type">
            <span>${column.icon}</span>
            <span>${column.dataType}</span>
          </div>
        </div>
      `;

      // Add click handler
      columnDiv.addEventListener('click', () => {
        // Unselect all
        document.querySelectorAll('.column-option').forEach(el => {
          el.classList.remove('selected');
          const radio = el.querySelector('input[type="radio"]') as HTMLInputElement;
          if (radio) radio.checked = false;
        });

        // Select this one
        columnDiv.classList.add('selected');
        const radio = columnDiv.querySelector('input[type="radio"]') as HTMLInputElement;
        if (radio) {
          radio.checked = true;
          this.updatePreview(column.index);
          this.updateImportButton();
        }
      });

      columnsList.appendChild(columnDiv);
    });
  }

  private autoSelectBestColumn(): void {
    if (!this.currentFileData || this.currentFileData.columns.length === 0) return;

    // Find column with highest text score
    const bestColumn = this.currentFileData.columns[0]; // Already sorted by textScore

    const radio = document.getElementById(`column-${bestColumn.index}`) as HTMLInputElement;
    const columnOption = radio?.closest('.column-option') as HTMLElement;

    if (radio && columnOption) {
      radio.checked = true;
      columnOption.classList.add('selected');
      this.updatePreview(bestColumn.index);
      this.updateImportButton();
    }
  }

  private updatePreview(columnIndex: number): void {
    if (!this.currentFileData) return;

    const column = this.currentFileData.columns.find(c => c.index === columnIndex);
    if (!column) return;

    const previewSection = document.getElementById('preview-section');
    const previewBox = document.getElementById('preview-box');

    if (previewSection && previewBox) {
      previewSection.style.display = 'block';

      // Check if newlines should be removed
      const removeNewlinesCheckbox = document.getElementById('remove-newlines') as HTMLInputElement;
      const removeNewlines = removeNewlinesCheckbox?.checked ?? true;

      // Get preview data
      let previewData = this.currentFileData.rawData
        .slice(1, FileImporter.PREVIEW_ROWS + 1) // Skip header, take first 5 rows
        .map(row => row[columnIndex] || '')
        .filter(value => value.toString().trim() !== '');

      // Apply newline processing to preview if enabled
      if (removeNewlines) {
        previewData = previewData.map(value =>
          value.toString().replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
        );
      }

      previewBox.innerHTML = '';

      previewData.forEach((value, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.textContent = `${index + 1}. ${value}`;
        previewBox.appendChild(item);
      });

      if (previewData.length === 0) {
        previewBox.innerHTML = '<div class="preview-item">No data preview available</div>';
      }
    }
  }

  private updateImportButton(): void {
    const importBtn = document.getElementById('column-selection-import') as HTMLButtonElement;
    const selectedRadio = document.querySelector('input[name="column-selection"]:checked') as HTMLInputElement;

    if (importBtn) {
      importBtn.disabled = !selectedRadio;
    }
  }

  private performImport(): void {
    if (!this.currentFileData) return;

    const selectedRadio = document.querySelector('input[name="column-selection"]:checked') as HTMLInputElement;
    if (!selectedRadio) return;

    const columnIndex = parseInt(selectedRadio.value);
    const modeRadio = document.querySelector('input[name="import-mode"]:checked') as HTMLInputElement;
    const mode = modeRadio?.value as 'replace' | 'append' || 'replace';

    // Check if newlines should be removed
    const removeNewlinesCheckbox = document.getElementById('remove-newlines') as HTMLInputElement;
    const removeNewlines = removeNewlinesCheckbox?.checked ?? true;

    // Extract column data
    let columnData = this.currentFileData.rawData
      .slice(1) // Skip header
      .map(row => row[columnIndex] || '')
      .filter(value => value.toString().trim() !== '') // Remove empty values
      .map(value => value.toString().trim());

    // Process newlines if requested
    if (removeNewlines) {
      columnData = columnData.map(value =>
        value.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
      );
    }

    const dataText = columnData.join('\n');

    // Close modal
    const columnModal = document.getElementById('column-selection-modal');
    if (columnModal) {
      columnModal.style.display = 'none';
    }

    // Import data
    this.onDataImported(dataText);

    // Show success message
    const newlineNote = removeNewlines ? ' (newlines removed)' : '';
    console.log(`📤 Imported ${columnData.length} text entries from ${this.currentFileData.fileName} in ${mode} mode${newlineNote}`);

    // Reset state
    this.currentFileData = null;
  }

  private showUploadProgress(): void {
    const progress = document.getElementById('upload-progress');
    if (progress) {
      progress.style.display = 'block';
    }
  }

  private hideUploadProgress(): void {
    const progress = document.getElementById('upload-progress');
    if (progress) {
      progress.style.display = 'none';
    }
  }

  private resetUploadProgress(): void {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill) {
      progressFill.style.width = '0%';
    }

    if (progressText) {
      progressText.textContent = 'Processing file...';
    }

    this.hideUploadProgress();
  }

  private formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    } else {
      return `${bytes} bytes`;
    }
  }
}