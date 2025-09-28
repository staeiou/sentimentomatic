import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CacheManager } from '../core/models/CacheManager'
import { useAnalysisStore } from './analysisStore'

interface ModelConfig {
  id: string
  huggingFaceId: string
  displayName: string
  category: 'sentiment' | 'classification'
  type: 'rule-based' | 'neural'
}

export const useModelStore = defineStore('models', () => {
  // State
  const cacheManager = new CacheManager()

  // Rule-based models
  const useAfinn = ref(false)
  const useVader = ref(false)

  // Sentiment models
  const useDistilbert = ref(false)
  const useTwitterRoberta = ref(false)
  const useFinancial = ref(false)
  const useMultilingualStudent = ref(true)

  // Classification models
  const useGoEmotions = ref(false)
  const useKoalaModeration = ref(false)
  const useIptcNews = ref(false)
  const useLanguageDetection = ref(false)
  const useToxicBert = ref(false)
  const useJigsawToxicity = ref(false)
  const useIndustryClassification = ref(false)

  // Settings
  const keepModelsCached = ref(false)
  const cacheSize = ref(0)
  const cacheModelCount = ref(0)

  // All available models
  const availableModels: ModelConfig[] = [
    // Rule-based
    { id: 'afinn', huggingFaceId: 'afinn', displayName: 'AFINN', category: 'sentiment', type: 'rule-based' },
    { id: 'vader', huggingFaceId: 'vader', displayName: 'VADER', category: 'sentiment', type: 'rule-based' },

    // Sentiment neural models
    { id: 'twitter-roberta', huggingFaceId: 'Xenova/twitter-roberta-base-sentiment-latest', displayName: 'Twitter RoBERTa', category: 'sentiment', type: 'neural' },
    { id: 'financial', huggingFaceId: 'Xenova/finbert', displayName: 'Financial DistilRoBERTa', category: 'sentiment', type: 'neural' },
    { id: 'multilingual-student', huggingFaceId: 'Xenova/distilbert-base-multilingual-cased-sentiments-student', displayName: 'Multilingual DistilBERT', category: 'sentiment', type: 'neural' },
    { id: 'distilbert', huggingFaceId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', displayName: 'DistilBERT SST-2', category: 'sentiment', type: 'neural' },

    // Classification models
    { id: 'go-emotions', huggingFaceId: 'SamLowe/roberta-base-go_emotions-onnx', displayName: 'GoEmotions', category: 'classification', type: 'neural' },
    { id: 'text-moderation', huggingFaceId: 'KoalaAI/Text-Moderation', displayName: 'KoalaAI Moderation', category: 'classification', type: 'neural' },
    { id: 'iptc-news', huggingFaceId: 'onnx-community/multilingual-IPTC-news-topic-classifier-ONNX', displayName: 'IPTC News', category: 'classification', type: 'neural' },
    { id: 'language-detection', huggingFaceId: 'protectai/xlm-roberta-base-language-detection-onnx', displayName: 'Language Detection', category: 'classification', type: 'neural' },
    { id: 'toxic-bert', huggingFaceId: 'Xenova/toxic-bert', displayName: 'Toxic BERT', category: 'classification', type: 'neural' },
    { id: 'jigsaw-toxicity', huggingFaceId: 'minuva/MiniLMv2-toxic-jigsaw-onnx', displayName: 'Jigsaw Toxicity', category: 'classification', type: 'neural' },
    { id: 'industry-classification', huggingFaceId: 'sabatale/industry-classification-api-onnx', displayName: 'Industry Classification', category: 'classification', type: 'neural' }
  ]

  // Computed
  const selectedRuleBasedAnalyzers = computed(() => {
    const selected: string[] = []
    if (useVader.value) selected.push('vader')
    if (useAfinn.value) selected.push('afinn')
    return selected
  })

  const selectedNeuralModels = computed(() => {
    const analysisStore = useAnalysisStore()
    const multiModel = analysisStore.getMultiModelAnalyzer()

    // Clear and re-add models based on current selection
    multiModel.clearAllModels()

    const modelMappings = [
      { checkbox: useDistilbert, model: availableModels.find(m => m.id === 'distilbert')! },
      { checkbox: useTwitterRoberta, model: availableModels.find(m => m.id === 'twitter-roberta')! },
      { checkbox: useFinancial, model: availableModels.find(m => m.id === 'financial')! },
      { checkbox: useMultilingualStudent, model: availableModels.find(m => m.id === 'multilingual-student')! },
      { checkbox: useGoEmotions, model: availableModels.find(m => m.id === 'go-emotions')! },
      { checkbox: useKoalaModeration, model: availableModels.find(m => m.id === 'text-moderation')! },
      { checkbox: useIptcNews, model: availableModels.find(m => m.id === 'iptc-news')! },
      { checkbox: useLanguageDetection, model: availableModels.find(m => m.id === 'language-detection')! },
      { checkbox: useToxicBert, model: availableModels.find(m => m.id === 'toxic-bert')! },
      { checkbox: useJigsawToxicity, model: availableModels.find(m => m.id === 'jigsaw-toxicity')! },
      { checkbox: useIndustryClassification, model: availableModels.find(m => m.id === 'industry-classification')! }
    ]

    const selected: string[] = []
    modelMappings.forEach(({ checkbox, model }) => {
      if (checkbox.value) {
        multiModel.addModel(model.id, model.huggingFaceId, model.displayName)
        selected.push(model.id)
      }
    })

    return selected
  })

  const hasClassificationModels = computed(() => {
    return useGoEmotions.value || useKoalaModeration.value || useIptcNews.value ||
           useLanguageDetection.value || useToxicBert.value || useJigsawToxicity.value ||
           useIndustryClassification.value
  })

  const totalSelectedModels = computed(() => {
    return selectedRuleBasedAnalyzers.value.length + selectedNeuralModels.value.length
  })

  // Actions
  function selectAllModels() {
    // Rule-based
    useAfinn.value = true
    useVader.value = true

    // Sentiment
    useDistilbert.value = true
    useTwitterRoberta.value = true
    useFinancial.value = true
    useMultilingualStudent.value = true

    // Classification
    useGoEmotions.value = true
    useKoalaModeration.value = true
    useIptcNews.value = true
    useLanguageDetection.value = true
    useToxicBert.value = true
    useJigsawToxicity.value = true
    useIndustryClassification.value = true
  }

  function clearAllModels() {
    // Rule-based
    useAfinn.value = false
    useVader.value = false

    // Sentiment
    useDistilbert.value = false
    useTwitterRoberta.value = false
    useFinancial.value = false
    useMultilingualStudent.value = false

    // Classification
    useGoEmotions.value = false
    useKoalaModeration.value = false
    useIptcNews.value = false
    useLanguageDetection.value = false
    useToxicBert.value = false
    useJigsawToxicity.value = false
    useIndustryClassification.value = false
  }

  async function updateCacheStats() {
    try {
      // Use fast storage.estimate() for all browsers
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage } = await navigator.storage.estimate()
        cacheSize.value = usage || 0
        // We can't get exact model count from storage.estimate, so skip it
        cacheModelCount.value = 0
      } else {
        // Fallback to manual calculation if storage.estimate not available
        const stats = await cacheManager.getCacheStats()
        cacheSize.value = stats.totalSize
        cacheModelCount.value = stats.modelCount
      }
    } catch (error) {
      console.warn('Failed to update cache stats:', error)
    }
  }

  async function clearCache() {
    await cacheManager.clearCache()
    await updateCacheStats()
  }

  async function getModelDownloadInfo() {
    const models = []

    // Add rule-based models (always "cached")
    for (const analyzer of selectedRuleBasedAnalyzers.value) {
      models.push({
        name: analyzer.toUpperCase(),
        size: 1 * 1024 * 1024, // 1MB
        huggingFaceId: `Rule-based ${analyzer} analyzer`,
        cached: true
      })
    }

    // Collect neural model IDs for batch checking
    const neuralModelInfos = []
    const huggingFaceIds = []

    for (const modelId of selectedNeuralModels.value) {
      const modelInfo = availableModels.find(m => m.id === modelId)
      if (modelInfo) {
        neuralModelInfos.push(modelInfo)
        huggingFaceIds.push(modelInfo.huggingFaceId)
      }
    }

    // BATCH CHECK all models at once (opens cache ONCE, checks in parallel)
    const cacheStatusMap = await cacheManager.batchCheckModelsInCache(huggingFaceIds)

    // Build result using batch check results
    for (const modelInfo of neuralModelInfos) {
      const estimatedSizeMB = cacheManager.estimateModelSize(modelInfo.huggingFaceId)
      const isCached = cacheStatusMap.get(modelInfo.huggingFaceId) || false

      models.push({
        name: modelInfo.displayName,
        size: estimatedSizeMB * 1024 * 1024,
        huggingFaceId: modelInfo.huggingFaceId,
        cached: isCached
      })
    }

    return models
  }

  // Initialize cache stats - now fast for all browsers
  updateCacheStats()

  // Load saved settings
  const savedKeepCached = localStorage.getItem('sentimentomatic_keep_models_cached')
  if (savedKeepCached === 'true') {
    keepModelsCached.value = true
  }

  return {
    // State
    useAfinn,
    useVader,
    useDistilbert,
    useTwitterRoberta,
    useFinancial,
    useMultilingualStudent,
    useGoEmotions,
    useKoalaModeration,
    useIptcNews,
    useLanguageDetection,
    useToxicBert,
    useJigsawToxicity,
    useIndustryClassification,
    keepModelsCached,
    cacheSize,
    cacheModelCount,

    // Computed
    selectedRuleBasedAnalyzers,
    selectedNeuralModels,
    hasClassificationModels,
    totalSelectedModels,
    availableModels,

    // Actions
    selectAllModels,
    clearAllModels,
    updateCacheStats,
    clearCache,
    getModelDownloadInfo
  }
})