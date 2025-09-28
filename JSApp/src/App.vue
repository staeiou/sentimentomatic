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
    </main>

    <!-- Modals -->
    <FileImportModal ref="fileImportRef" />
    <SampleDatasetsModal ref="sampleDatasetsRef" />
    <TemplateGeneratorModal ref="templateGeneratorRef" />
    <DownloadConfirmationModal ref="downloadConfirmationRef" />
    <SafariWarningModal ref="safariWarningRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
import FileImportModal from './components/FileImport/FileImportModal.vue'
import SampleDatasetsModal from './components/SampleDatasetsModal.vue'
import TemplateGeneratorModal from './components/TemplateGeneratorModal.vue'
import DownloadConfirmationModal from './components/DownloadConfirmationModal.vue'
import SafariWarningModal from './components/SafariWarningModal.vue'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()

// Component refs
const inputSectionRef = ref<InstanceType<typeof InputSection>>()
const fileImportRef = ref<InstanceType<typeof FileImportModal>>()
const sampleDatasetsRef = ref<InstanceType<typeof SampleDatasetsModal>>()
const templateGeneratorRef = ref<InstanceType<typeof TemplateGeneratorModal>>()
const downloadConfirmationRef = ref<InstanceType<typeof DownloadConfirmationModal>>()
const safariWarningRef = ref<InstanceType<typeof SafariWarningModal>>()

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

// Check for Safari on mount
onMounted(() => {
  // Check if Safari and if warning hasn't been dismissed
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const warningDismissed = localStorage.getItem('sentimentomatic_safari_warning_dismissed') === 'true'

  if (isSafari && !warningDismissed) {
    // Delay slightly to ensure everything is rendered
    setTimeout(() => {
      safariWarningRef.value?.open()
    }, 500)
  }
})
</script>

<style>
/* No scoped styles - using global CSS */
</style>