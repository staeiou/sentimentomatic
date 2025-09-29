import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MultiModalAnalysisResult } from '../core/analysis/AnalysisStrategy'
import { AnalyzerRegistry } from '../core/analyzers'
import { MultiModelAnalyzer } from '../core/analyzers/MultiModelAnalyzer'

export const useAnalysisStore = defineStore('analysis', () => {
  // State
  const text = ref('')
  const lines = computed(() => text.value.split('\n').filter(line => line.trim()))
  const isAnalyzing = ref(false)
  const progress = ref(0)
  const progressStatus = ref('')
  const currentResult = ref<MultiModalAnalysisResult | null>(null)

  // Core analysis components (initialized once)
  const analyzerRegistry = new AnalyzerRegistry()
  const multiModelAnalyzer = new MultiModelAnalyzer(
    analyzerRegistry.getModelManager()
  )
  // Remove DOM-based controller - using Vue reactive state instead

  // Actions
  function updateText(newText: string) {
    text.value = newText
  }

  function clearText() {
    text.value = ''
    currentResult.value = null
  }

  async function runAnalysis(
    selectedRuleBasedAnalyzers: string[],
    selectedHuggingFaceModels: string[],
    keepModelsCached: boolean,
    onTableReady?: () => void
  ) {
    if (lines.value.length === 0) {
      throw new Error('No text to analyze')
    }

    isAnalyzing.value = true
    progress.value = 0
    progressStatus.value = 'Initializing...'

    // Initialize table structure with all lines upfront (like original)
    const unifiedResults: any[] = []
    for (let i = 0; i < lines.value.length; i++) {
      unifiedResults.push({
        lineIndex: i,
        text: lines.value[i],
        results: []
      })
    }

    // CRITICAL: Create ALL columns upfront before analysis starts
    const columns: Array<{name: string, type: 'sentiment' | 'classification', modelId?: string}> = []

    // Add rule-based analyzers to columns (always sentiment type)
    for (const analyzer of selectedRuleBasedAnalyzers) {
      columns.push({ name: analyzer.toUpperCase(), type: 'sentiment' })
    }

    // Add ML models to columns (with proper type based on model)
    const CLASSIFICATION_MODELS = [
      'GoEmotions',
      'Jigsaw Toxicity',
      'KoalaAI Moderation',
      'IPTC News',
      'Language Detection',
      'Toxic BERT',
      'Industry Classification'
    ]

    for (const modelId of selectedHuggingFaceModels) {
      const modelInfo = multiModelAnalyzer.getEnabledModels().get(modelId)
      if (modelInfo) {
        // Determine if this is a classification or sentiment model
        const isClassification = CLASSIFICATION_MODELS.includes(modelInfo.displayName)
        columns.push({
          name: modelInfo.displayName,
          type: isClassification ? 'classification' : 'sentiment',
          modelId
        })
      }
    }

    // Create result structure with ALL columns visible immediately
    currentResult.value = {
      type: 'multimodal' as const,
      data: unifiedResults,
      lines: lines.value, // Add lines array for export compatibility
      columns // All columns created upfront
    }

    onTableReady?.() // Signal table is ready for incremental updates

    try {
      // Simple progress: 3 units per model (download, load, process)
      const totalModels = selectedRuleBasedAnalyzers.length + selectedHuggingFaceModels.length
      const totalUnits = totalModels * 3
      let completedUnits = 0

      // CRITICAL: Model type detection logic (EXACTLY like original)
      const isClassificationResult = (metadata: any): boolean => {
        // Check model type in metadata
        if (metadata?.modelType) {
          return metadata.modelType !== 'sentiment'
        }
        // Fallback: if there are multiple classes in fullRawOutput, it's classification
        if (metadata?.fullRawOutput && Array.isArray(metadata.fullRawOutput)) {
          return metadata.fullRawOutput.length > 3 // More than 3 classes = classification
        }
        return false
      }

      // Process ANALYZER BY ANALYZER (column-by-column, like original)

      // Initialize rule-based analyzers
      for (const analyzer of selectedRuleBasedAnalyzers) {
        await analyzerRegistry.initializeAnalyzer(analyzer)
      }

      // Process rule-based analyzers - ONE ANALYZER FOR ALL LINES
      for (const analyzerName of selectedRuleBasedAnalyzers) {
        const analyzerInstance = analyzerRegistry.getAnalyzer(analyzerName)
        if (!analyzerInstance?.isReady()) continue

        // Unit 1: Model "downloaded" (rule-based are instant)
        completedUnits++
        progress.value = (completedUnits / totalUnits) * 100
        progressStatus.value = `Ready ${analyzerName.toUpperCase()}...`

        // Unit 2: Model "loaded" (rule-based are instant)
        completedUnits++
        progress.value = (completedUnits / totalUnits) * 100
        progressStatus.value = `Loaded ${analyzerName.toUpperCase()}...`

        // Unit 3: Process all lines
        progressStatus.value = `Running ${analyzerName.toUpperCase()} on all lines...`

        // Process this analyzer on ALL lines (fills column incrementally)
        for (let lineIndex = 0; lineIndex < lines.value.length; lineIndex++) {
          const text = lines.value[lineIndex]

          try {
            const result = await analyzerInstance.analyze(text)
            const processedResult = Array.isArray(result) ? result[0] : result

            const cellResult = {
              analyzer: analyzerName.toUpperCase(),
              type: 'sentiment' as const,
              score: processedResult.score,
              sentiment: processedResult.sentiment,
              metadata: processedResult.metadata,
              rawOutput: processedResult
            }

            // Add to unified results for this line
            unifiedResults[lineIndex].results.push(cellResult)

            // Trigger reactivity for incremental update (cell appears immediately)
            currentResult.value = { ...currentResult.value }

            // Small delay for visual effect (like original)
            await new Promise(resolve => setTimeout(resolve, 50))

          } catch (error) {
            console.warn(`Failed to analyze with ${analyzerName} on line ${lineIndex + 1}:`, error)
            const errorResult = {
              analyzer: analyzerName.toUpperCase(),
              type: 'sentiment' as const,
              score: 0,
              sentiment: 'neutral' as const,
              metadata: { error: true },
              rawOutput: { error: error instanceof Error ? error.message : 'Unknown error' }
            }

            unifiedResults[lineIndex].results.push(errorResult)
            currentResult.value = { ...currentResult.value }
          }
        }

        // Unit 3 complete
        completedUnits++
        progress.value = (completedUnits / totalUnits) * 100
      }

      // Process ML models - ONE MODEL AT A TIME FOR ALL LINES
      for (const modelId of selectedHuggingFaceModels) {
        const modelInfo = multiModelAnalyzer.getEnabledModels().get(modelId)
        if (!modelInfo) continue

        try {
          // Unit 1: Download/Create worker
          progressStatus.value = `🚀 Creating worker for ${modelInfo.displayName}...`
          await multiModelAnalyzer.initializeWorker()
          completedUnits++
          progress.value = (completedUnits / totalUnits) * 100

          // Unit 2: Load model
          progressStatus.value = `📥 Loading ${modelInfo.displayName}...`
          await multiModelAnalyzer.initializeSingleModel(modelId)
          completedUnits++
          progress.value = (completedUnits / totalUnits) * 100

          // Unit 3: Process all lines
          progressStatus.value = `🔍 Running ${modelInfo.displayName} on all lines...`

          for (let lineIndex = 0; lineIndex < lines.value.length; lineIndex++) {
            const text = lines.value[lineIndex]

            try {
              const result = await multiModelAnalyzer.analyzeWithModel(text, modelId)
              if (result) {
                // CRITICAL: Determine if this is classification or sentiment (EXACTLY like original)
                const isClassification = isClassificationResult(result.metadata)

                if (isClassification) {
                  // Update column type to classification if this is the first time we've seen this model
                  const columnToUpdate = columns.find(col => col.modelId === modelId)
                  if (columnToUpdate && columnToUpdate.type === 'sentiment') {
                    columnToUpdate.type = 'classification'
                    console.log(`📊 Updated column type for ${modelInfo.displayName} to 'classification'`)
                  }

                  // Handle as classification model (EXACTLY like original)
                  const cellResult = {
                    analyzer: result.analyzer,
                    type: 'classification' as const,
                    topClass: result.metadata?.topLabel || result.metadata?.rawPrediction?.label || 'Unknown',
                    confidence: result.score, // Already 0-1 from our fix
                    allClasses: result.metadata?.fullRawOutput?.reduce((acc: any, pred: any) => {
                      acc[pred.label] = pred.score
                      return acc
                    }, {}) || {},
                    metadata: result.metadata,
                    rawOutput: result
                  }

                  // Add to unified results for this line
                  unifiedResults[lineIndex].results.push(cellResult)
                } else {
                  // Handle as sentiment model (EXACTLY like original)
                  const cellResult = {
                    analyzer: result.analyzer,
                    type: 'sentiment' as const,
                    score: result.score,
                    sentiment: result.sentiment,
                    metadata: result.metadata,
                    rawOutput: result
                  }

                  // Add to unified results for this line
                  unifiedResults[lineIndex].results.push(cellResult)
                }

                // Trigger reactivity for incremental update (cell appears immediately)
                currentResult.value = { ...currentResult.value }

                // Small delay for visual effect (like original)
                await new Promise(resolve => setTimeout(resolve, 50))
              }
            } catch (error) {
              console.warn(`Model ${modelInfo.displayName} failed on line ${lineIndex + 1}:`, error)
              const errorResult = {
                analyzer: modelInfo.displayName,
                type: 'classification' as const,
                score: 0,
                sentiment: 'neutral' as const,
                topClass: 'ERROR',
                confidence: 0,
                metadata: { error: true, errorMessage: String(error) },
                rawOutput: { error: error instanceof Error ? error.message : 'Unknown error' }
              }

              unifiedResults[lineIndex].results.push(errorResult)
              currentResult.value = { ...currentResult.value }
            }
          }

          // Unit 3 complete
          completedUnits++
          progress.value = (completedUnits / totalUnits) * 100

          // Cleanup: TERMINATE WORKER to completely free ALL memory for this model
          progressStatus.value = `💥 Terminating worker to free memory for ${modelInfo.displayName}...`
          await multiModelAnalyzer.terminateWorker()
          console.log(`✅ Worker terminated - ALL memory freed for ${modelInfo.displayName}`)

          // Clear browser cache if not keeping cached (optional)
          if (!keepModelsCached) {
            console.log(`🗑️ Clearing browser cache for ${modelInfo.displayName}...`)
            // Cache clearing would go here if implemented
          }

        } catch (error) {
          console.error(`❌ Failed to process model ${modelInfo.displayName}:`, error)
          // ALWAYS terminate worker on error to free memory
          try {
            await multiModelAnalyzer.terminateWorker()
            console.log(`🗑️ Terminated worker after error for ${modelInfo.displayName}`)
          } catch (terminateError) {
            console.warn(`⚠️ Failed to terminate worker for ${modelInfo.displayName}:`, terminateError)
          }

          // Still increment progress for failed model
          completedUnits++
          progress.value = (completedUnits / totalUnits) * 100
        }
      }

      // Return the final result (columns already set upfront)
      return currentResult.value
    } finally {
      isAnalyzing.value = false
      progress.value = 100
      progressStatus.value = `Analysis complete - ${lines.value.length} lines processed`
    }
  }

  function getAnalyzerRegistry() {
    return analyzerRegistry
  }

  function getMultiModelAnalyzer() {
    return multiModelAnalyzer
  }

  return {
    // State
    text,
    lines,
    isAnalyzing,
    progress,
    progressStatus,
    currentResult,

    // Actions
    updateText,
    clearText,
    runAnalysis,
    getAnalyzerRegistry,
    getMultiModelAnalyzer
  }
})