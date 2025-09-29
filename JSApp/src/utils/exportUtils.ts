import type { AnalysisResult, SentimentResult, MultiModalAnalysisResult } from '../core/analysis/AnalysisStrategy';
import * as XLSX from 'xlsx';

// Helper function to properly escape CSV values
function escapeCSV(value: string): string {
  if (typeof value !== 'string') return String(value);
  // If value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(result: AnalysisResult | MultiModalAnalysisResult, expandMulticlass: boolean = false): void {
  if (!result || !result.data || result.data.length === 0) {
    alert('No results to export');
    return;
  }

  let csvContent = '';

  if (result.type === 'multimodal') {
    // Handle multimodal format with both sentiment and classification
    const multimodalResult = result as MultiModalAnalysisResult;
    const unifiedData = multimodalResult.data;
    const columns = multimodalResult.columns;

    // Collect all unique class names for each classification model when expanding
    const classificationClassNames: Map<string, Set<string>> = new Map();
    if (expandMulticlass) {
      columns.forEach((col: any) => {
        if (col.type === 'classification') {
          const classNames = new Set<string>();
          unifiedData.forEach((item) => {
            const result = item.results.find((r: any) => r.analyzer === col.name);
            if (result && result.allClasses) {
              Object.keys(result.allClasses).forEach(className => classNames.add(className));
            }
          });
          classificationClassNames.set(col.name, classNames);
        }
      });
    }

    // Create header
    const header = ['Line', 'Text'];
    columns.forEach((col: any) => {
      if (col.type === 'sentiment') {
        header.push(`${col.name}_Score`, `${col.name}_Sentiment`);
      } else if (col.type === 'classification') {
        if (expandMulticlass && classificationClassNames.has(col.name)) {
          // Add majority class columns first
          header.push(`${col.name}_Majority_Prediction`, `${col.name}_Majority_Likelihood`);
          // Then add individual columns for each class
          const classNames = Array.from(classificationClassNames.get(col.name)!).sort();
          classNames.forEach(className => {
            header.push(`${col.name}_Class_${className}`);
          });
        } else {
          // Standard classification columns
          header.push(`${col.name}_Prediction`, `${col.name}_Likelihood`);
        }
      }
    });
    csvContent = header.join(',') + '\n';

    // Add data rows
    unifiedData.forEach((item) => {
      const row = [
        (item.lineIndex + 1).toString(),
        escapeCSV(item.text)
      ];

      // Add data for each column in order
      columns.forEach((col: any) => {
        const result = item.results.find((r: any) => r.analyzer === col.name);
        if (result) {
          if (col.type === 'sentiment') {
            row.push(result.score != null ? result.score.toFixed(3) : '0.000', escapeCSV(result.sentiment || 'neutral'));
          } else if (col.type === 'classification') {
            if (expandMulticlass && classificationClassNames.has(col.name)) {
              // Add majority class columns first
              row.push(escapeCSV(result.metadata?.exportLabel || result.topClass || 'N/A'), result.confidence != null ? result.confidence.toFixed(3) : '0.000');
              // Then add individual class confidence scores
              const classNames = Array.from(classificationClassNames.get(col.name)!).sort();
              classNames.forEach(className => {
                const confidence = result.allClasses && result.allClasses[className]
                  ? result.allClasses[className].toFixed(3)
                  : '0.000';
                row.push(confidence);
              });
            } else {
              // Standard classification columns
              row.push(escapeCSV(result.metadata?.exportLabel || result.topClass || 'N/A'), result.confidence != null ? result.confidence.toFixed(3) : '0.000');
            }
          }
        } else {
          // Missing result for this column
          if (col.type === 'sentiment') {
            row.push('0.000', 'neutral');
          } else if (col.type === 'classification') {
            if (expandMulticlass && classificationClassNames.has(col.name)) {
              // Add majority class columns first
              row.push('N/A', '0.000');
              // Then add zeros for all classes
              const classNames = Array.from(classificationClassNames.get(col.name)!).sort();
              classNames.forEach(() => row.push('0.000'));
            } else {
              // Standard classification columns
              row.push('N/A', '0.000');
            }
          }
        }
      });

      csvContent += row.join(',') + '\n';
    });
  } else if (result.type === 'sentiment') {
    // Legacy sentiment format
    const sentimentData = result.data as SentimentResult[];

    // Create header
    const firstResult = sentimentData[0];
    const analyzers = firstResult.results.map(r => r.analyzer);
    const header = ['Line', 'Text', ...analyzers.map(a => `${a}_Score`), ...analyzers.map(a => `${a}_Sentiment`)];
    csvContent = header.join(',') + '\n';

    // Add data rows
    sentimentData.forEach((item, index) => {
      const row = [
        (index + 1).toString(),
        escapeCSV(item.text)
      ];

      // Add scores
      item.results.forEach(r => {
        row.push(r.score.toFixed(3));
      });

      // Add sentiments
      item.results.forEach(r => {
        row.push(escapeCSV(r.sentiment));
      });

      csvContent += row.join(',') + '\n';
    });
  } else {
    alert('Unsupported export format');
    return;
  }

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Create timestamp in YYYY-MM-DD_HH-MM-SS format
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  const filename = `sentimentomatic_export_${timestamp}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(result: AnalysisResult | MultiModalAnalysisResult, expandMulticlass: boolean = false): void {
  if (!result || !result.data || result.data.length === 0) {
    alert('No results to export');
    return;
  }

  let exportData: any;

  if (result.type === 'multimodal') {
    // Handle multimodal format with both sentiment and classification
    const multimodalResult = result as MultiModalAnalysisResult;
    const unifiedData = multimodalResult.data;
    const columns = multimodalResult.columns;

    const structuredResults = unifiedData.map((item) => {
      const lineData: any = {
        line: item.lineIndex + 1,
        text: item.text,
        analysis: {}
      };

      // Group results by analyzer
      item.results.forEach((res: any) => {
        const column = columns.find((col: any) => col.name === res.analyzer);
        if (column?.type === 'sentiment') {
          lineData.analysis[res.analyzer] = {
            type: 'sentiment',
            score: res.score,
            sentiment: res.sentiment
          };
        } else if (column?.type === 'classification') {
          const analysisData: any = {
            type: 'classification',
            prediction: res.metadata?.exportLabel || res.topClass,
            likelihood: res.confidence
          };

          // Add individual class scores when expanding multi-class
          if (expandMulticlass && res.allClasses) {
            analysisData.allClassScores = res.allClasses;
          }

          lineData.analysis[res.analyzer] = analysisData;
        }
      });

      return lineData;
    });

    exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        analysisType: 'multimodal',
        totalLines: result.lines.length,
        analyzers: columns.map((col: any) => ({
          name: col.name,
          type: col.type
        }))
      },
      results: structuredResults
    };
  } else {
    // Legacy formats
    exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        analysisType: result.type,
        totalLines: result.lines.length
      },
      lines: result.lines,
      results: result.data
    };
  }

  const jsonContent = JSON.stringify(exportData, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Create timestamp in YYYY-MM-DD_HH-MM-SS format
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  const filename = `sentimentomatic_export_${timestamp}.json`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(result: AnalysisResult | MultiModalAnalysisResult, expandMulticlass: boolean = false): void {
  if (!result || !result.data || result.data.length === 0) {
    alert('No results to export');
    return;
  }

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  let wsData: any[][] = [];

  if (result.type === 'multimodal') {
    // Handle multimodal format with both sentiment and classification
    const multimodalResult = result as MultiModalAnalysisResult;
    const unifiedData = multimodalResult.data;
    const columns = multimodalResult.columns;

    // Collect all unique class names for each classification model when expanding
    const classificationClassNames: Map<string, Set<string>> = new Map();
    if (expandMulticlass) {
      columns.forEach((col: any) => {
        if (col.type === 'classification') {
          const classNames = new Set<string>();
          unifiedData.forEach((item) => {
            const result = item.results.find((r: any) => r.analyzer === col.name);
            if (result && result.allClasses) {
              Object.keys(result.allClasses).forEach(className => classNames.add(className));
            }
          });
          classificationClassNames.set(col.name, classNames);
        }
      });
    }

    // Create header row
    const header = ['Line', 'Text'];
    columns.forEach((col: any) => {
      if (col.type === 'sentiment') {
        header.push(`${col.name}_Score`, `${col.name}_Sentiment`);
      } else if (col.type === 'classification') {
        if (expandMulticlass && classificationClassNames.has(col.name)) {
          // Add majority class columns first
          header.push(`${col.name}_Majority_Prediction`, `${col.name}_Majority_Likelihood`);
          // Then add individual columns for each class
          const classNames = Array.from(classificationClassNames.get(col.name)!).sort();
          classNames.forEach(className => {
            header.push(`${col.name}_Class_${className}`);
          });
        } else {
          // Standard classification columns
          header.push(`${col.name}_Prediction`, `${col.name}_Likelihood`);
        }
      }
    });
    wsData.push(header);

    // Add data rows
    unifiedData.forEach((item) => {
      const row: any[] = [
        item.lineIndex + 1,
        item.text
      ];

      // Add data for each column in order
      columns.forEach((col: any) => {
        const result = item.results.find((r: any) => r.analyzer === col.name);
        if (result) {
          if (col.type === 'sentiment') {
            row.push(
              result.score != null ? parseFloat(result.score.toFixed(3)) : 0,
              result.sentiment || 'neutral'
            );
          } else if (col.type === 'classification') {
            if (expandMulticlass && classificationClassNames.has(col.name)) {
              // Add majority class columns first
              row.push(
                result.metadata?.exportLabel || result.topClass || 'N/A',
                result.confidence != null ? parseFloat(result.confidence.toFixed(3)) : 0
              );
              // Then add individual class confidence scores
              const classNames = Array.from(classificationClassNames.get(col.name)!).sort();
              classNames.forEach(className => {
                const confidence = result.allClasses && result.allClasses[className]
                  ? parseFloat(result.allClasses[className].toFixed(3))
                  : 0;
                row.push(confidence);
              });
            } else {
              // Standard classification columns
              row.push(
                result.metadata?.exportLabel || result.topClass || 'N/A',
                result.confidence != null ? parseFloat(result.confidence.toFixed(3)) : 0
              );
            }
          }
        } else {
          // Missing result for this column
          if (col.type === 'sentiment') {
            row.push(0, 'neutral');
          } else if (col.type === 'classification') {
            if (expandMulticlass && classificationClassNames.has(col.name)) {
              // Add majority class columns first
              row.push('N/A', 0);
              // Then add zeros for all classes
              const classNames = Array.from(classificationClassNames.get(col.name)!).sort();
              classNames.forEach(() => row.push(0));
            } else {
              // Standard classification columns
              row.push('N/A', 0);
            }
          }
        }
      });

      wsData.push(row);
    });
  } else if (result.type === 'sentiment') {
    // Legacy sentiment format
    const sentimentData = result.data as SentimentResult[];

    // Create header
    const firstResult = sentimentData[0];
    const analyzers = firstResult.results.map(r => r.analyzer);
    const header = ['Line', 'Text', ...analyzers.map(a => `${a}_Score`), ...analyzers.map(a => `${a}_Sentiment`)];
    wsData.push(header);

    // Add data rows
    sentimentData.forEach((item, index) => {
      const row: any[] = [
        index + 1,
        item.text
      ];

      // Add scores
      item.results.forEach(r => {
        row.push(parseFloat(r.score.toFixed(3)));
      });

      // Add sentiments
      item.results.forEach(r => {
        row.push(r.sentiment);
      });

      wsData.push(row);
    });
  } else {
    alert('Unsupported export format');
    return;
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns
  const maxLengths: number[] = [];
  wsData.forEach(row => {
    row.forEach((cell, i) => {
      const length = String(cell).length;
      maxLengths[i] = Math.max(maxLengths[i] || 0, length);
    });
  });

  ws['!cols'] = maxLengths.map(len => ({ wch: Math.min(len + 2, 50) }));

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Sentiment Analysis');

  // Create timestamp in YYYY-MM-DD_HH-MM-SS format
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  const filename = `sentimentomatic_export_${timestamp}.xlsx`;

  // Write and download file
  XLSX.writeFile(wb, filename);
}