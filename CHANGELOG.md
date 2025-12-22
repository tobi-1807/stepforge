# Changelog

## [0.1.0](https://github.com/tobi-1807/stepforge/compare/stepforge-v0.0.1...stepforge-v0.1.0) (2025-12-22)


### Features

* Add `inputs` helper to simplify workflow input definitions and improve type inference. ([9b04d69](https://github.com/tobi-1807/stepforge/commit/9b04d69399076cef0477f5a2c9f2797905340cd1))
* Add a clear logs button to the UI by exposing a `clearEvents` function from `useEventStream`. ([c249236](https://github.com/tobi-1807/stepforge/commit/c24923660bdc749aea40638e2cf1b776628625c1))
* add common ignore patterns for OS, logs, environment variables, IDE files, TypeScript artifacts, and package manager cache. ([32c098c](https://github.com/tobi-1807/stepforge/commit/32c098c4222af6abf162321be65faadf23b733cd))
* Add example workflow template, enhance backend build process, and improve UI workflow management with loading states and example creation functionality. ([c1e7eb6](https://github.com/tobi-1807/stepforge/commit/c1e7eb60d376cc4f1d9f43eebd7fa4e86624a0a1))
* Add MIT license, configure project for distribution, improve build process, and enhance UI serving logic. ([471ac95](https://github.com/tobi-1807/stepforge/commit/471ac95af0a86936a631d0a5fa48f3d273bce137))
* Add proOptions to GraphViewer to hide attribution, enhancing user experience and customization options. ([c76971b](https://github.com/tobi-1807/stepforge/commit/c76971b2fe65d5f0e8f62fe7a42f7f4f2cce7f96))
* Add ReactFlowProvider and programmatically fit graph view after layout. ([78d3699](https://github.com/tobi-1807/stepforge/commit/78d369970024ba8f0e62d934ac4cc5fdf27887bf))
* Add README.md to introduce Stepforge, outlining its purpose, functionality, and key design principles for workflow management in TypeScript. ([1a79971](https://github.com/tobi-1807/stepforge/commit/1a7997190890278f711e61ed818cc1f44ea9ea01))
* add shared state example and SDK support ([0f544f3](https://github.com/tobi-1807/stepforge/commit/0f544f31416050aa4749d0bf19e248840f79bbc9))
* Add UI for run configuration and node details, and introduce an AWS deployment example. ([fc0c7ad](https://github.com/tobi-1807/stepforge/commit/fc0c7ade999833507abb8cfcb8795425f41e51c7))
* add wf.check, declarative assertions for workflows ([c936f5a](https://github.com/tobi-1807/stepforge/commit/c936f5a8f159310c3eeb5f99073c5bf12abdc3ad))
* Enable dynamic daemon-Vite proxying and HMR support by exchanging port files. ([8bfac93](https://github.com/tobi-1807/stepforge/commit/8bfac93f95f41583888c4f50b4841ac07825a0d8))
* Enhance Vite configuration by increasing chunk size warning limit and implementing manual chunking for React, React DOM, React Flow, and ELK.js to optimize build output. ([c1e4374](https://github.com/tobi-1807/stepforge/commit/c1e43744d47baa9afe5c8def8dca229f7c6c97f4))
* Implement initial monorepo structure with UI, daemon, SDK, and runner-child packages for workflow orchestration. ([e26986d](https://github.com/tobi-1807/stepforge/commit/e26986dba53f5e12b0eff71669c32734d7530bd8))
* Implement run management features with pause, resume, and cancel controls, and integrate with UI for execution state monitoring. ([7072599](https://github.com/tobi-1807/stepforge/commit/70725998052a12f8482be20fc43074fc35852634))
* Implement step retry logic in SDK, display attempt count in UI, and add a retry example. ([1da9077](https://github.com/tobi-1807/stepforge/commit/1da9077b5a32d4b4147d75e4b7a971e69cf38138))
* Integrate ELK layout algorithm into GraphViewer for improved graph rendering, adding elkjs dependency and refactoring layout logic to enhance node positioning and visual structure. ([548940e](https://github.com/tobi-1807/stepforge/commit/548940e9faff3e877846c65d5636cb1d677ed44e))
* Introduce `ctx.output()` for steps to emit structured data, which is now displayed in the UI and persisted in the run state. ([94ebb8c](https://github.com/tobi-1807/stepforge/commit/94ebb8c3fcc2077850f5af3cbc369d2f0a46bc75))
* Introduce `ctx.sleep` for cancellable and pause-aware workflow delays, replacing direct `setTimeout` usage in examples and adding tests. ([8c9cf6c](https://github.com/tobi-1807/stepforge/commit/8c9cf6cd4e4330f7bf254bbb4f8173c01377de4a))
* Introduce `IterationStepContext` for map template steps, guaranteeing `loop` and `iteration` properties, and update related types and examples. ([ae379a0](https://github.com/tobi-1807/stepforge/commit/ae379a086e6c33f6994302b3e1fcbe8bf9071238))
* Introduce map functionality in workflow management, enabling iteration over items with customizable options and enhanced UI components for map state visualization ([c8c4bf6](https://github.com/tobi-1807/stepforge/commit/c8c4bf644121b3b7a04a9fd73be8cfb5a7bc2ed8))
* redesign "check" node to be compact and feel like constrains rather than tasks ([d762582](https://github.com/tobi-1807/stepforge/commit/d76258270261a8656d7385e6c33733d366dd4a17))
* Replace `concurrently` with `mprocs` for local development script orchestration. ([c51eb16](https://github.com/tobi-1807/stepforge/commit/c51eb16f264f3de55ade8e0fd26b3778608bfadb))
* update map buildTemplate signature to remove item and index parameters, relying on ctx.loop.item for type inference ([63d13d3](https://github.com/tobi-1807/stepforge/commit/63d13d3d00e2d0eb491e6e0ca564975248484759))


### Bug Fixes

* add cursor pointer style to buttons in App and WorkflowList components for better UX ([76c3fcd](https://github.com/tobi-1807/stepforge/commit/76c3fcdce190df0be0898ef850b5490f7aea5f29))
