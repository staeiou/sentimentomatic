<template>
  <div id="text-input" class="code-editor"></div>
</template>

<script setup lang="ts">
import { onMounted, watch, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { useAnalysisStore } from '../../stores/analysisStore'

const analysisStore = useAnalysisStore()
let editorView: EditorView | null = null
let isUpdatingFromStore = false // Flag to prevent feedback loops

const defaultText = `Each line will be analyzed independently and given a score by various models.
THIS IS SO SUPER COOL AND THE BEST EVER! YES!
This means that lines are the units of analysis. WOW! No matter how many sentences are in a line, it will score them all together. 
If you are analyzing a text with newlines, you have to remove them, or else your analysis will be wrong and you will be sad.
Ugh, I hate hate HATE trying to write examples, it's not fun! I'm not happy!
If you have more sad, negative, terrible, ugly, no good, very bad words in a sentence, sentiment models will output a more negative score.
If you mix sad, happy, and neutral words, what happens? What if you have "This is awesome" and "This is awful" in the same input?
Oh honey, bless your heart!
😢😠😢
Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.
There are three kinds of lies: lies, damned lies, and statistics.
Facebook says sorry for shutting down page of French town of Bitche
u can def analyze slang w/ vader, its gr8! text analysis ftw!
Although a double negative in English implies a positive meaning, there is no language in which a double positive implies a negative.
Yeah, right.
Sentiment analysis is the perfect and foolproof method for every research project ever --- NOT!
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

  // Create update listener to properly handle all CodeMirror changes
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !isUpdatingFromStore) {
      const text = update.state.doc.toString()
      analysisStore.updateText(text)
    }
  })

  // Initialize CodeMirror editor with proper change detection
  editorView = new EditorView({
    state: EditorState.create({
      doc: defaultText,
      extensions: [basicSetup, fixedHeightTheme, updateListener]
    }),
    parent: container
  })

  // Update store with initial text
  analysisStore.updateText(defaultText)

  // Analysis controller initialization removed - using Vue reactive components now
})

// Watch for external text changes (e.g., from file import)
watch(() => analysisStore.text, (newText) => {
  if (editorView && editorView.state.doc.toString() !== newText) {
    isUpdatingFromStore = true
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newText
      }
    })
    // Reset flag after a longer delay to ensure the update is fully processed
    // This prevents race conditions with rapid updates
    setTimeout(() => {
      isUpdatingFromStore = false
    }, 100)
  }
})

// Clean up on component unmount
onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})

// Expose methods for parent components
defineExpose({
  clearText() {
    if (editorView) {
      isUpdatingFromStore = true
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: ''
        }
      })
      analysisStore.clearText()
      // Consistent delay with watcher to prevent race conditions
      setTimeout(() => {
        isUpdatingFromStore = false
      }, 100)
    }
  },
  setText(text: string) {
    if (editorView) {
      isUpdatingFromStore = true
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: text
        }
      })
      analysisStore.updateText(text)
      // Consistent delay with watcher to prevent race conditions
      setTimeout(() => {
        isUpdatingFromStore = false
      }, 100)
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
