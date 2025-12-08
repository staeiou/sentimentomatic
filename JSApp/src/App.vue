<template>
  <div class="app-container">
    <AppHeader />

    <main class="app-main">
      <InstructionsCard />
      <PrivacyBanner />

      <InputSection
        ref="inputSectionRef"
        @showTemplateGenerator="templateGeneratorRef?.open()"
        @showSampleDatasets="sampleDatasetsRef?.open()"
        @showFileImport="fileImportRef?.show()"
        @clearText="inputSectionRef?.clearText()"
      />

      <ControlsSection />

      <ActionSection @analyze="analyze" />

      <ResultsSection />
      <CacheClearSection />
    </main>

    <AppFooter />

    <!-- Modals -->
    <FileImportModal ref="fileImportRef" />
    <SampleDatasetsModal ref="sampleDatasetsRef" />
    <TemplateGeneratorModal ref="templateGeneratorRef" />
    <DownloadConfirmationModal ref="downloadConfirmationRef" />
    <SafariWarningModal ref="safariWarningRef" />
    <ShareModal ref="shareModalRef" />
    <RotateDeviceModal ref="rotateDeviceRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useAnalysisStore } from './stores/analysisStore'
import { useModelStore } from './stores/modelStore'
// Components
import AppHeader from './components/AppHeader.vue'
import InstructionsCard from './components/InstructionsCard.vue'
import PrivacyBanner from './components/PrivacyBanner.vue'
import InputSection from './components/InputSection.vue'
import ControlsSection from './components/ControlsSection.vue'
import ActionSection from './components/ActionSection.vue'
import ResultsSection from './components/ResultsTable/ResultsSection.vue'
import CacheClearSection from './components/CacheClearSection.vue'
import AppFooter from './components/AppFooter.vue'
import FileImportModal from './components/FileImport/FileImportModal.vue'
import SampleDatasetsModal from './components/SampleDatasetsModal.vue'
import TemplateGeneratorModal from './components/TemplateGeneratorModal.vue'
import DownloadConfirmationModal from './components/DownloadConfirmationModal.vue'
import SafariWarningModal from './components/SafariWarningModal.vue'
import ShareModal from './components/ShareModal.vue'
import RotateDeviceModal from './components/RotateDeviceModal.vue'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()

// Component refs
const inputSectionRef = ref<InstanceType<typeof InputSection>>()
const fileImportRef = ref<InstanceType<typeof FileImportModal>>()
const sampleDatasetsRef = ref<InstanceType<typeof SampleDatasetsModal>>()
const templateGeneratorRef = ref<InstanceType<typeof TemplateGeneratorModal>>()
const downloadConfirmationRef = ref<InstanceType<typeof DownloadConfirmationModal>>()
const safariWarningRef = ref<InstanceType<typeof SafariWarningModal>>()
const shareModalRef = ref<InstanceType<typeof ShareModal>>()
const rotateDeviceRef = ref<InstanceType<typeof RotateDeviceModal>>()

// Provide share modal opener to all child components
provide('openShareModal', () => shareModalRef.value?.open())

// Analysis logic
async function analyze() {
  const lines = analysisStore.lines
  if (lines.length === 0) {
    alert('Please enter some text to analyze')
    return
  }

  const selectedRuleBased = modelStore.selectedRuleBasedAnalyzers
  const selectedNeural = modelStore.selectedNeuralModels

  if (selectedRuleBased.length === 0 && selectedNeural.length === 0) {
    alert('Please select at least one model to analyze')
    return
  }

  // Show modal immediately with loading state
  const confirmed = await downloadConfirmationRef.value?.showConfirmationWithLoading()
  if (!confirmed) {
    return
  }

  try {
    // Scroll to progress bar immediately when analysis starts
    setTimeout(() => {
      const progressElement = document.querySelector('.progress-bar-inline')
      if (progressElement) {
        progressElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)

    await analysisStore.runAnalysis(
      selectedRuleBased,
      selectedNeural,
      modelStore.keepModelsCached,
      () => {
        // Table ready callback
      }
    )

    // Update cache stats after analysis
    setTimeout(() => {
      modelStore.updateCacheStats()
    }, 3000)
  } catch (error) {
    console.error('Analysis failed:', error)
    alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Check for Safari on mount and load shared URL
onMounted(async () => {
  // Check for mobile device in portrait mode - show rotation prompt
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768
  const isPortrait = window.matchMedia("(orientation: portrait)").matches
  const rotationDismissed = localStorage.getItem('sentimentomatic_rotation_dismissed') === 'true'

  if (isMobile && isPortrait && !rotationDismissed) {
    // Show rotation prompt immediately
    setTimeout(() => {
      rotateDeviceRef.value?.open()
    }, 300)
  }

  // Check if Safari and if warning hasn't been dismissed
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const warningDismissed = localStorage.getItem('sentimentomatic_safari_warning_dismissed') === 'true'

  if (isSafari && !warningDismissed) {
    // Delay slightly to ensure everything is rendered
    setTimeout(() => {
      safariWarningRef.value?.open()
    }, 500)
  }

  // NEW: Check for shared text in URL
  const { loadFromUrl, cleanUrl } = await import('./utils/urlSharing')
  const shared = await loadFromUrl()

  if (shared) {
    // Load text into editor
    analysisStore.updateText(shared.text)

    // Pre-select models if specified
    if (shared.models && shared.models.length > 0) {
      // Map model IDs to checkbox refs
      for (const modelId of shared.models) {
        if (modelId === 'vader') modelStore.useVader = true
        else if (modelId === 'afinn') modelStore.useAfinn = true
        else if (modelId === 'twitter-roberta') modelStore.useTwitterRoberta = true
        else if (modelId === 'financial') modelStore.useFinancial = true
        else if (modelId === 'distilbert') modelStore.useDistilbert = true
        else if (modelId === 'multilingual-student') modelStore.useMultilingualStudent = true
        else if (modelId === 'goemotions') modelStore.useGoEmotions = true
        else if (modelId === 'koala-moderation') modelStore.useKoalaModeration = true
        else if (modelId === 'iptc-news') modelStore.useIptcNews = true
        else if (modelId === 'language-detection') modelStore.useLanguageDetection = true
        else if (modelId === 'toxic-bert') modelStore.useToxicBert = true
        else if (modelId === 'jigsaw-toxicity') modelStore.useJigsawToxicity = true
        else if (modelId === 'industry-classification') modelStore.useIndustryClassification = true
      }
    }

    // Clean URL (remove query params) for cleaner browser history
    cleanUrl()
  }
})
</script>

<style>
/* No scoped styles - using global CSS */
</style>