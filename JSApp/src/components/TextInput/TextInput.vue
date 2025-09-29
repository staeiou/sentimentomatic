<template>
  <div id="text-input" class="code-editor"></div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { useAnalysisStore } from '../../stores/analysisStore'

const analysisStore = useAnalysisStore()
let editorView: EditorView | null = null

const defaultText = `Each line will be analyzed independently and given scores by various models.
THIS IS SO SUPER COOL AND THE BEST EVER! YES!
This means that lines are the units of analysis, no matter how many sentences. AWESOME! 😍
Ugh, I hate hate HATE trying to write examples, it's not fun! I'm not happy!
😢😠😢
Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.
There are three kinds of lies: lies, damned lies, and statistics.
Facebook says sorry for shutting down page of French town of Bitche
u can def analyze slang w/ vader, its gr8! text analysis ftw!
Although a double negative in English implies a positive meaning, there is no language in which a double positive implies a negative.
Yeah, right.
Sentiment analysis is the perfect and foolproof method for every research project ever --- NOT!
Your items/lines can be up to 2,500 characters. Just make sure there are no newlines in your units of texts. Note that long texts (more than 250 words) can break VADER, and textblob handles longer texts better.
¡Esta aplicación es ABSOLUTAMENTE INCREÍBLE! ¡La mejor que he visto en mi vida! ¡Espectacular!
Odio este análisis basura, no funciona para nada y es una pérdida total de tiempo
El que nace para maceta del corredor no pasa
Aplikasi ini sangat bagus sekali! Luar biasa! Keren banget! Saya suka sekali!
Jelek sekali programnya, busuk, tidak berguna sama sekali, saya benci ini
Air beriak tanda tak dalam
这是我见过最棒最完美的应用！太牛了！强烈推荐给所有人！必须五星好评！
垃圾软件！烂透了！浪费我时间！谁做的这个破玩意儿？差评差评差评！
塞翁失马，焉知非福`

onMounted(() => {
  const container = document.getElementById('text-input')
  if (!container) return

  // Create fixed height theme to match original
  const fixedHeightTheme = EditorView.theme({
    '&': { height: '400px' },
    '.cm-scroller': { overflow: 'auto' }
  })

  // Initialize CodeMirror editor
  editorView = new EditorView({
    state: EditorState.create({
      doc: defaultText,
      extensions: [basicSetup, fixedHeightTheme]
    }),
    parent: container
  })

  // Update store with initial text
  analysisStore.updateText(defaultText)

  // Watch for text changes
  editorView.dom.addEventListener('input', () => {
    if (editorView) {
      const text = editorView.state.doc.toString()
      analysisStore.updateText(text)
    }
  })

  // Analysis controller initialization removed - using Vue reactive components now
})

// Watch for external text changes (e.g., from file import)
watch(() => analysisStore.text, (newText) => {
  if (editorView && editorView.state.doc.toString() !== newText) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newText
      }
    })
  }
})

// Expose methods for parent components
defineExpose({
  clearText() {
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: ''
        }
      })
      analysisStore.clearText()
    }
  },
  setText(text: string) {
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: text
        }
      })
      analysisStore.updateText(text)
    }
  },
  focus() {
    if (editorView) {
      editorView.focus()
    }
  }
})
</script>

<style>
/* No scoped styles - using global CSS for original styling */
</style>