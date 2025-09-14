export interface LabelConfig {
  id: string;
  name: string;
  sentence: string;
  threshold: number;
}

export class LabelManager {
  private labels: Map<string, LabelConfig> = new Map();
  private container: HTMLElement;
  private template: string = "This text is emotionally {}.";
  private onChangeCallback?: () => void;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;
    this.loadFromStorage();
    this.render();
  }

  setTemplate(template: string): void {
    this.template = template;
    // Update all existing labels with new template
    this.labels.forEach(label => {
      label.sentence = this.generateSentence(label.name);
    });
    this.saveToStorage();
    this.render();
  }

  addLabel(name: string, threshold: number = 0.5): void {
    if (!name.trim()) return;

    const id = this.generateId(name);
    if (this.labels.has(id)) {
      // Silently ignore duplicates
      console.log(`Label "${name}" already exists`);
      return;
    }

    const label: LabelConfig = {
      id,
      name: name.trim(),
      sentence: this.generateSentence(name),
      threshold
    };

    this.labels.set(id, label);
    this.saveToStorage();
    this.render();
    this.triggerChange();
  }

  removeLabel(id: string): void {
    this.labels.delete(id);
    this.saveToStorage();
    this.render();
    this.triggerChange();
  }

  updateLabelSentence(id: string, sentence: string): void {
    const label = this.labels.get(id);
    if (label) {
      label.sentence = sentence;
      this.saveToStorage();
      this.triggerChange();
    }
  }

  updateLabelThreshold(id: string, threshold: number, silent: boolean = false): void {
    const label = this.labels.get(id);
    if (label) {
      label.threshold = threshold;
      this.saveToStorage();
      if (!silent) {
        this.triggerChange();
      }
    }
  }

  getLabels(): LabelConfig[] {
    return Array.from(this.labels.values());
  }

  getLabelNames(): string[] {
    return Array.from(this.labels.values()).map(l => l.name);
  }

  getLabelSentences(): string[] {
    return Array.from(this.labels.values()).map(l => l.sentence);
  }

  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private generateSentence(labelName: string): string {
    // Keep the original case of the label name
    return this.template.replace('{}', labelName);
  }

  getTemplate(): string {
    return this.template;
  }

  private render(): void {
    this.container.innerHTML = '';

    if (this.labels.size === 0) {
      this.container.innerHTML = '<div class="empty-labels">No labels added yet. Add your first label above!</div>';
      return;
    }

    this.labels.forEach(label => {
      const labelElement = this.createLabelElement(label);
      this.container.appendChild(labelElement);
    });
  }

  private createLabelElement(label: LabelConfig): HTMLElement {
    const div = document.createElement('div');
    div.className = 'label-item';
    div.dataset.labelId = label.id;

    div.innerHTML = `
      <div class="label-header">
        <span class="label-name">${label.name}</span>
        <button class="remove-label" data-id="${label.id}">×</button>
      </div>
      <input
        type="text"
        class="label-sentence"
        value="${label.sentence}"
        data-id="${label.id}"
        placeholder="Describe when this label applies..."
      />
    `;

    // Add event listeners
    const removeBtn = div.querySelector('.remove-label') as HTMLButtonElement;
    removeBtn.addEventListener('click', () => this.removeLabel(label.id));

    const sentenceInput = div.querySelector('.label-sentence') as HTMLInputElement;
    sentenceInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.updateLabelSentence(label.id, target.value);
    });

    return div;
  }

  private saveToStorage(): void {
    const data = {
      labels: Array.from(this.labels.values()),
      template: this.template
    };
    localStorage.setItem('com-labels', JSON.stringify(data));
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('com-labels');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.labels) {
          this.labels.clear();
          data.labels.forEach((label: LabelConfig) => {
            this.labels.set(label.id, label);
          });
        }
        if (data.template) {
          this.template = data.template;
        }
      } catch (error) {
        console.error('Failed to load labels from storage:', error);
      }
    }
  }

  private triggerChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  clear(): void {
    this.labels.clear();
    this.saveToStorage();
    this.render();
    this.triggerChange();
  }

  // Add some default labels for quick start
  loadDefaults(type: 'sentiment' | 'spam' | 'topics'): void {
    this.clear();

    const defaults: Record<string, string[]> = {
      sentiment: ['Positive', 'Negative', 'Neutral'],
      spam: ['Spam', 'Legitimate'],
      topics: ['Politics', 'Business', 'Sports', 'Technology', 'Entertainment']
    };

    const labels = defaults[type] || [];
    labels.forEach(name => this.addLabel(name));
  }
}