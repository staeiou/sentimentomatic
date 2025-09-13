import type { AnalyzerPreset } from './types';
import { getPreset, getAllPresets } from './registry';

export class PresetManager {
  private currentPreset: string;
  private storage: Storage;

  constructor(defaultPreset: string = 'fast') {
    this.currentPreset = defaultPreset;
    this.storage = typeof window !== 'undefined' ? window.localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      length: 0,
      clear: () => {},
      key: () => null
    } as Storage;
    
    // Load saved preset from storage
    const saved = this.storage.getItem('sentimentomatic-preset');
    if (saved && getPreset(saved)) {
      this.currentPreset = saved;
    }
  }

  /**
   * Get the current preset configuration
   */
  getCurrentPreset(): AnalyzerPreset | undefined {
    return getPreset(this.currentPreset);
  }

  /**
   * Get the current preset ID
   */
  getCurrentPresetId(): string {
    return this.currentPreset;
  }

  /**
   * Set the active preset
   */
  setPreset(presetId: string): boolean {
    const preset = getPreset(presetId);
    if (!preset) {
      console.error(`Preset '${presetId}' not found`);
      return false;
    }

    this.currentPreset = presetId;
    this.storage.setItem('sentimentomatic-preset', presetId);
    console.log(`🎛️ Switched to preset: ${preset.name}`);
    return true;
  }

  /**
   * Get all available presets
   */
  getAvailablePresets(): AnalyzerPreset[] {
    return getAllPresets();
  }

  /**
   * Get the model ID for a specific analyzer from the current preset
   */
  getModelForAnalyzer(analyzerType: string): string | undefined {
    const preset = this.getCurrentPreset();
    if (!preset) return undefined;

    return (preset.models as any)[analyzerType];
  }

  /**
   * Get performance characteristics of current preset
   */
  getPerformanceInfo(): AnalyzerPreset['performance'] | undefined {
    return this.getCurrentPreset()?.performance;
  }

  /**
   * Check if a preset supports a specific language
   */
  supportsLanguage(language: string, presetId?: string): boolean {
    const preset = getPreset(presetId || this.currentPreset);
    if (!preset) return false;

    // For now, assume English support. In the future, check model configs
    return language === 'en';
  }
}