# SentimentOMatic Architecture Overview

## Executive Summary

SentimentOMatic is a **100% client-side sentiment analysis application** that runs machine learning models directly in the browser using WebAssembly and ONNX Runtime. It's built with Vite, TypeScript, and vanilla JavaScript (no UI framework), implementing sophisticated memory management and worker-based processing to handle large ML models efficiently.

## Core Architecture Principles

### 1. Browser-First ML
- **No backend required** - all processing happens client-side
- Uses Transformers.js to run ONNX models via WebAssembly
- Models are downloaded from HuggingFace CDN and cached locally
- Supports both rule-based (VADER, AFINN) and neural models

### 2. Memory Management Strategy
- **Worker-based isolation** - models run in Web Workers that can be terminated to free ALL memory
- **Per-model lifecycle** - each model gets its own worker that's created, used, and destroyed
- **Browser cache persistence** - models are cached in the browser's Cache API for instant reloads
- **WASM limitation awareness** - acknowledges that WebAssembly memory can only grow, never shrink

### 3. UI Without Frameworks
- **Vanilla TypeScript** - direct DOM manipulation without React/Vue/Angular
- **Event-driven architecture** - uses native DOM events and callbacks
- **Incremental rendering** - table rows are added progressively with animations
- **Manual state management** - no state library, just class properties and DOM

## High-Level Component Structure

```
┌──────────────────────────────────────────────────────────┐
│                      User Interface                       │
│  (index.html + main.ts + styles.css)                     │
├──────────────────────────────────────────────────────────┤
│                   Analysis Controller                     │
│  (StreamingAnalysisController)                           │
├──────────────┬─────────────────┬────────────────────────┤
│   Analyzers   │  Model Manager  │   Table Renderer       │
│  ┌─────────┐  │  ┌───────────┐  │  ┌────────────────┐   │
│  │ VADER   │  │  │  Model    │  │  │  Incremental   │   │
│  │ AFINN   │  │  │  Manager  │  │  │  Table         │   │
│  │ Multi   │  │  │  Worker   │  │  │  Renderer      │   │
│  │ Model   │  │  │  Manager  │  │  └────────────────┘   │
│  └─────────┘  │  └───────────┘  │                       │
├───────────────┴─────────────────┴────────────────────────┤
│                    Worker Layer                          │
│  (transformers.worker.ts - isolated context)             │
├──────────────────────────────────────────────────────────┤
│                  Browser APIs                            │
│  (Cache API, IndexedDB, LocalStorage, WebAssembly)       │
└──────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. No Backend Required
**Decision**: Run everything client-side
**Rationale**: Privacy, no server costs, offline capability, no data transmission
**Trade-off**: Large initial downloads, browser memory limits, no server-side processing

### 2. Vanilla JavaScript UI
**Decision**: No UI framework (React/Vue/Angular)
**Rationale**: Smaller bundle, direct control, no framework overhead
**Trade-off**: More boilerplate, manual state management, harder to maintain

### 3. Worker-Based Model Isolation
**Decision**: Each ML model runs in its own worker that's terminated after use
**Rationale**: WebAssembly memory can't be freed, only way to reclaim memory
**Trade-off**: Worker creation overhead, complex message passing, no shared state

### 4. Streaming Analysis Pattern
**Decision**: Process line-by-line with incremental updates
**Rationale**: Better UX feedback, memory efficiency, progressive rendering
**Trade-off**: More complex implementation, coordination challenges

### 5. Multi-Model Architecture
**Decision**: Support multiple analyzer types simultaneously
**Rationale**: Compare different approaches, flexibility, comprehensive analysis
**Trade-off**: Memory usage, complexity, performance overhead

## Data Flow

### Analysis Pipeline
1. **Input** → Text entered or file imported
2. **Preprocessing** → Text split into lines, validated
3. **Analysis Selection** → User chooses analyzers/models
4. **Model Loading** → Download or retrieve from cache
5. **Worker Creation** → Spawn worker for ML models
6. **Processing** → Line-by-line analysis with streaming
7. **Rendering** → Incremental table updates
8. **Worker Termination** → Free memory after each model
9. **Export** → Generate CSV/JSON/Excel output

### Memory Lifecycle
```
User selects model → Check cache → Download if needed →
Create worker → Load model in worker → Process all lines →
Terminate worker (FREE ALL MEMORY) → Next model
```

## Technology Stack

### Core
- **Build Tool**: Vite 6.0
- **Language**: TypeScript 5.7
- **Runtime**: Browser JavaScript + WebAssembly

### ML Infrastructure
- **Transformers.js**: 3.7.3 - ONNX model inference
- **ONNX Runtime Web**: Via Transformers.js
- **Model Source**: HuggingFace Hub

### Rule-Based Analyzers
- **VADER**: Sentiment analysis with social media awareness
- **AFINN**: Word-based sentiment scoring

### Data Processing
- **Papa Parse**: CSV parsing
- **SheetJS (XLSX)**: Excel file handling
- **Browser Cache API**: Model persistence

### Development
- **Playwright**: E2E testing
- **TypeScript**: Type safety
- **Vite**: Fast HMR and builds

## Performance Characteristics

### Strengths
- **Zero latency** after initial model load (everything local)
- **Progressive enhancement** - works with just rule-based if ML fails
- **Efficient caching** - models persist across sessions
- **Memory recovery** - worker termination frees all WASM memory

### Limitations
- **Initial download size** - models are 50-500MB each
- **Memory ceiling** - browser tab memory limits apply
- **Single-threaded UI** - heavy processing can block
- **WASM memory growth** - can only increase, never decrease (within a worker)

## Security & Privacy

### Advantages
- **No data transmission** - everything stays in browser
- **No API keys** - no authentication needed
- **No tracking** - completely offline capable
- **User control** - all processing transparent

### Considerations
- **Client-side exposure** - all code visible
- **Browser sandbox** - limited by browser security model
- **Cache persistence** - models stored locally
- **Memory inspection** - sensitive data in browser memory

## Scalability Patterns

### Current Approach
- **Vertical scaling** - limited by browser/device capabilities
- **Model selection** - user chooses which models to run
- **Incremental processing** - line-by-line to manage memory
- **Cache management** - automatic browser cache with manual clear option

### Future Considerations
- Could add service worker for background processing
- Could implement model quantization for smaller sizes
- Could add WebGPU support for acceleration
- Could implement streaming from server (hybrid approach)

## Maintenance Challenges

### Current Pain Points
1. **Vanilla JS complexity** - lots of manual DOM manipulation
2. **Worker communication** - complex message passing
3. **Model compatibility** - each model has quirks
4. **Memory debugging** - hard to profile WASM memory
5. **Type safety gaps** - dynamic model outputs hard to type

### Technical Debt
- Monolithic main.ts file (1000+ lines)
- Mixed patterns (OOP classes + functional + procedural)
- Hard-coded model configurations
- Manual HTML string templating
- Global window functions for events

## Summary

SentimentOMatic represents a **bold architectural choice** to run ML entirely in the browser. It successfully handles the challenges of:
- Running large neural networks client-side
- Managing WebAssembly memory limitations
- Providing responsive UI without frameworks
- Supporting multiple analysis approaches

The architecture prioritizes **user privacy and control** over simplicity, resulting in a complex but powerful system that pushes the boundaries of what's possible in browser-based ML applications.