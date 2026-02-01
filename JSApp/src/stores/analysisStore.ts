import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import type { MultiModalAnalysisResult } from '../core/analysis/AnalysisStrategy'
import { AnalyzerRegistry } from '../core/analyzers'
import { MultiModelAnalyzer } from '../core/analyzers/MultiModelAnalyzer'
import { useThemeStore } from './themeStore'

export const useAnalysisStore = defineStore('analysis', () => {
  const themeStore = useThemeStore()
  // State
  const text = ref('')
  const lines = computed(() => text.value.split('\n').filter(line => line.trim()))
  const isAnalyzing = ref(false)
  const progress = ref(0)
  const progressStatus = ref('')
  const currentResult = ref<MultiModalAnalysisResult | null>(null)

  // Timing state for tqdm-style progress
  const overallStartTime = ref<number>(0)
  const currentModelStartTime = ref<number>(0)
  const currentModelName = ref<string>('')
  const totalModels = ref<number>(0)
  const completedModels = ref<number>(0)
  const totalUnits = ref<number>(0)
  const completedUnits = ref<number>(0)
  const currentModelTotalLines = ref<number>(0)
  const currentModelProcessedLines = ref<number>(0)
  const now = ref<number>(Date.now()) // Reactive timestamp for computed properties

  // Better tracking: total work = lines * models
  const totalWorkItems = ref<number>(0) // Total lines to process across all models
  const completedWorkItems = ref<number>(0) // Lines actually processed

  // Rate smoothing with exponential moving average (EMA)
  const currentModelRate = ref<number>(0) // lines per ms, smoothed
  const overallRate = ref<number>(0) // work items per ms, smoothed
  const EMA_ALPHA = 0.3 // Smoothing factor (0.3 means 30% new, 70% old)

  let rafId: number | null = null
  let lastUpdateTime = 0
  const UPDATE_INTERVAL = 300 // Update every 300ms even with RAF

  // Core analysis components (initialized once)
  const analyzerRegistry = new AnalyzerRegistry()
  const multiModelAnalyzer = new MultiModelAnalyzer(
    analyzerRegistry.getModelManager()
  )
  // Remove DOM-based controller - using Vue reactive state instead

  // Helper: Format milliseconds to MM:SS or HH:MM:SS
  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Computed: Current model elapsed and remaining times
  const currentModelElapsed = computed(() => {
    if (!isAnalyzing.value || currentModelStartTime.value === 0) return '0:00'
    return formatTime(now.value - currentModelStartTime.value)
  })

  const currentModelRemaining = computed(() => {
    if (!isAnalyzing.value || currentModelRate.value === 0) return '?:??'
    const remaining = currentModelTotalLines.value - currentModelProcessedLines.value
    if (remaining <= 0) return '0:00'
    return formatTime(remaining / currentModelRate.value) // Use smoothed rate
  })

  // Computed: Overall elapsed and remaining times
  const overallElapsed = computed(() => {
    if (!isAnalyzing.value || overallStartTime.value === 0) return '0:00'
    return formatTime(now.value - overallStartTime.value)
  })

  const overallRemaining = computed(() => {
    if (!isAnalyzing.value || overallRate.value === 0) return '?:??'
    const remaining = totalWorkItems.value - completedWorkItems.value
    if (remaining <= 0) return '0:00'
    return formatTime(remaining / overallRate.value) // Use smoothed rate
  })

  // Update timing with RAF for smooth animation
  function updateTimingLoop() {
    const currentTime = Date.now()

    // Throttle updates to UPDATE_INTERVAL
    if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
      now.value = currentTime

      // Update smoothed rates using EMA
      if (currentModelProcessedLines.value > 0 && currentModelStartTime.value > 0) {
        const elapsed = currentTime - currentModelStartTime.value
        const instantRate = currentModelProcessedLines.value / elapsed
        // EMA: smoothedRate = alpha * instantRate + (1 - alpha) * previousRate
        currentModelRate.value = currentModelRate.value === 0
          ? instantRate
          : EMA_ALPHA * instantRate + (1 - EMA_ALPHA) * currentModelRate.value
      }

      if (completedWorkItems.value > 0 && overallStartTime.value > 0) {
        const elapsed = currentTime - overallStartTime.value
        const instantRate = completedWorkItems.value / elapsed
        overallRate.value = overallRate.value === 0
          ? instantRate
          : EMA_ALPHA * instantRate + (1 - EMA_ALPHA) * overallRate.value
      }

      lastUpdateTime = currentTime
    }

    // Continue loop if analyzing
    if (isAnalyzing.value) {
      rafId = requestAnimationFrame(updateTimingLoop)
    }
  }

  function startTimingLoop() {
    lastUpdateTime = Date.now()
    rafId = requestAnimationFrame(updateTimingLoop)
  }

  function stopTimingLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

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
    progressStatus.value = themeStore.performanceMode
      ? 'The curtain rises... (Initializing analysis)'
      : 'Initializing analysis pipeline...'

    // 2.5 second theatrical delay before first model (to match slower curtain animation)
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Initialize timing
    overallStartTime.value = Date.now()
    now.value = Date.now()
    totalModels.value = selectedRuleBasedAnalyzers.length + selectedHuggingFaceModels.length
    completedModels.value = 0
    totalUnits.value = totalModels.value * 3 // Each model has 3 units
    completedUnits.value = 0
    totalWorkItems.value = lines.value.length * totalModels.value // Total lines to process across all models
    completedWorkItems.value = 0
    currentModelStartTime.value = 0
    currentModelName.value = ''
    currentModelTotalLines.value = lines.value.length
    currentModelProcessedLines.value = 0
    currentModelRate.value = 0
    overallRate.value = 0

    // Stop any existing timing loop before starting a new one
    stopTimingLoop()
    // Start RAF timing loop
    startTimingLoop()

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
      'Jigsaw Toxicity MiniLMv2',
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
      let localCompletedUnits = 0

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

        // Start timing for this model
        currentModelName.value = analyzerName.toUpperCase()
        currentModelStartTime.value = Date.now()
        currentModelProcessedLines.value = 0

        // Unit 1: Model "downloaded" (rule-based are instant)
        localCompletedUnits++
        completedUnits.value++
        progress.value = (localCompletedUnits / totalUnits) * 100
        progressStatus.value = themeStore.performanceMode
          ? `${analyzerName.toUpperCase()} enters the stage (Loaded from cache)`
          : `${analyzerName.toUpperCase()} loaded from cache`

        // Unit 2: Model "loaded" (rule-based are instant)
        localCompletedUnits++
        completedUnits.value++
        progress.value = (localCompletedUnits / totalUnits) * 100
        progressStatus.value = themeStore.performanceMode
          ? `${analyzerName.toUpperCase()} enters the stage (Loaded from cache)`
          : `${analyzerName.toUpperCase()} loaded from cache`

        // Unit 3: Process all lines
        progressStatus.value = themeStore.performanceMode
          ? `NOW PERFORMING: ${analyzerName.toUpperCase()} (Processing ${lines.value.length} texts)`
          : `Running ${analyzerName.toUpperCase()} on ${lines.value.length} texts...`

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

            // Small delay for visual effect of results streaming in
            await new Promise(resolve => setTimeout(resolve, 15))

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

          // Update line counter for timing
          currentModelProcessedLines.value++
          completedWorkItems.value++ // Increment overall work items
        }

        // Unit 3 complete - model finished
        localCompletedUnits++
        completedUnits.value++
        completedModels.value++
        progress.value = (localCompletedUnits / totalUnits) * 100
      }

      // Process ML models - ONE MODEL AT A TIME FOR ALL LINES
      for (const modelId of selectedHuggingFaceModels) {
        const modelInfo = multiModelAnalyzer.getEnabledModels().get(modelId)
        if (!modelInfo) continue

        try {
          // Start timing for this model
          currentModelName.value = modelInfo.displayName
          currentModelStartTime.value = Date.now()
          currentModelProcessedLines.value = 0

          // Unit 1: Download/Create worker
          progressStatus.value = themeStore.performanceMode
            ? `${modelInfo.displayName} is arriving at the theater... (Creating web worker)`
            : `Initializing ${modelInfo.displayName} worker...`
          await multiModelAnalyzer.initializeWorker()
          localCompletedUnits++
          completedUnits.value++
          progress.value = (localCompletedUnits / totalUnits) * 100

          // Unit 2: Load model
          progressStatus.value = themeStore.performanceMode
            ? `${modelInfo.displayName} is getting into costume... (Downloading model)`
            : `Loading ${modelInfo.displayName} model...`
          await multiModelAnalyzer.initializeSingleModel(modelId)
          localCompletedUnits++
          completedUnits.value++
          progress.value = (localCompletedUnits / totalUnits) * 100

          // Unit 3: Process all lines
          progressStatus.value = themeStore.performanceMode
            ? `NOW PERFORMING: ${modelInfo.displayName} (Processing ${lines.value.length} texts)`
            : `Running ${modelInfo.displayName} inference on ${lines.value.length} texts...`

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
              }

              // Small delay for visual effect of results streaming in
              await new Promise(resolve => setTimeout(resolve, 15))
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

            // Update line counter for timing
            currentModelProcessedLines.value++
            completedWorkItems.value++ // Increment overall work items
          }

          // Unit 3 complete
          localCompletedUnits++
          completedUnits.value++
          completedModels.value++
          progress.value = (localCompletedUnits / totalUnits) * 100

          // Cleanup: TERMINATE WORKER to completely free ALL memory for this model
          progressStatus.value = themeStore.performanceMode
            ? `Round of applause for ${modelInfo.displayName}! (Terminating worker to free memory)`
            : `Cleaning up ${modelInfo.displayName} worker...`
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
          localCompletedUnits++
          completedUnits.value++
          progress.value = (localCompletedUnits / totalUnits) * 100
        }
      }

      // Return the final result (columns already set upfront)
      return currentResult.value
    } catch (error) {
      // Stop the RAF timing loop on error
      stopTimingLoop()
      throw error
    } finally {
      // Stop the RAF timing loop
      stopTimingLoop()

      isAnalyzing.value = false
      progress.value = 100
      progressStatus.value = themeStore.performanceMode
        ? `Final curtain! All performers have taken their bow. (Analysis complete - ${lines.value.length} lines processed)`
        : `Analysis complete - ${lines.value.length} lines processed by ${totalModels.value} models`
    }
  }

  function getAnalyzerRegistry() {
    return analyzerRegistry
  }

  function getMultiModelAnalyzer() {
    return multiModelAnalyzer
  }

  // Cleanup RAF on unmount to prevent memory leaks
  onUnmounted(() => {
    stopTimingLoop()
  })

  return {
    // State
    text,
    lines,
    isAnalyzing,
    progress,
    progressStatus,
    currentResult,

    // Timing state
    currentModelName,
    currentModelProcessedLines,
    totalModels,
    completedModels,

    // Computed timing
    currentModelElapsed,
    currentModelRemaining,
    overallElapsed,
    overallRemaining,

    // Actions
    updateText,
    clearText,
    runAnalysis,
    getAnalyzerRegistry,
    getMultiModelAnalyzer
  }
})
