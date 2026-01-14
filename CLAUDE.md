# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BioImage Suite Web (bisweb) is a web-based medical image analysis suite primarily for neuroimaging. It's a hybrid application with:
- Web applications (browser-based)
- Desktop applications (Electron)
- Command-line tools (Node.js and Python)
- WebAssembly modules compiled from C++

## Build Commands

### Initial Setup
```bash
npm install
node ./config/createbuild.js   # Creates build directories and installs emscripten
```

### Full Build
```bash
cd build
./fullbuild.sh   # Builds WASM, web app, native bindings, and runs tests
```

### Individual Build Components
```bash
cd build
./wasmbuild.sh      # Build C++ to WebAssembly
./webbuild.sh       # Build JS bundles for web
./nativebuild.sh    # Build Python/Matlab bindings
./testbuild.sh      # Run subset of tests
```

### Development Server
```bash
gulp              # Starts dev server with webpack watch on port 8080
gulp serve        # Same as above
gulp --portno 9000  # Use different port
```

### Build Web Application
```bash
gulp build -m     # Build with minification
gulp zip          # Create distribution zip
```

### Electron Desktop App
```bash
gulp package      # Package as desktop application
```

### Linting
```bash
gulp eslint       # Run ESLint on all JS files
gulp watch        # Watch and lint on changes
```

## Running Tests

### Node.js Tests (Mocha)
```bash
npm test                           # Run all tests
mocha test                         # Same as above
mocha test/test_module.js          # Run module tests
mocha test/test_module.js --input local  # Use local test data
mocha test/test_module.js --first 0 --last 10  # Run tests 0-10
mocha test/test_module.js --testname smoothImage  # Run specific module test
```

### Browser Tests
```bash
gulp serve
# Navigate to http://localhost:8080/web/biswebtest.html
```

### C++ Tests (after WASM build)
```bash
cd build/wasm
make test
```

## Architecture

### Directory Structure
- `js/` - JavaScript source code
  - `core/` - Core utilities (IO, WASM interface, preferences)
  - `dataobjects/` - Data object classes (BisWebImage, BisWebMatrix, transformations)
  - `modules/` - Processing modules (each inherits from BaseModule)
  - `webcomponents/` - Custom HTML elements for web UI
  - `node/` - Node.js specific code
  - `bin/` - Command-line entry points
- `cpp/` - C++ source for WebAssembly modules
- `web/` - HTML/CSS files and Electron configuration
- `config/` - Webpack and build configuration
- `compiletools/` - Build scripts
- `test/` - Test files and test data
- `biswebpython/` - Python wrapper package

### Key Patterns

**Module Architecture**: All processing modules extend `BaseModule` (`js/modules/basemodule.js`). Modules have:
- `createDescription()` - Returns JSON description with inputs, outputs, parameters
- `directInvokeAlgorithm()` - Core algorithm implementation
- Automatic command-line and GUI generation from description

**Data Objects**: Image and transform classes in `js/dataobjects/`:
- `BisWebImage` - Medical image class (NIfTI, etc.)
- `BisWebMatrix` - Matrix class
- `BisWeb*Transformation` - Linear, grid, combo transformations

**WASM Interface**: C++ code compiled to WebAssembly via Emscripten
- `libbiswasm_wrapper.js` - Auto-generated JS wrapper for C++ functions
- Memory management through serialized data transfer between JS and WASM

**Web Components**: Custom elements in `js/webcomponents/` provide reusable UI
- Viewers, controllers, dialogs built as web components
- Entry point: `bislib.js` bundles all components

### Configuration Files
- `package.json` - NPM dependencies and scripts
- `gulpfile.js` - Gulp task definitions
- `config/webpack.config.js` - Webpack bundling configuration
- `web/images/tools.json` - Tool definitions (viewers, applications)
- `test/module_tests.json` - Test definitions for modules

### Adding a New Module
1. Create module file in `js/modules/` extending `BaseModule`
2. Implement `createDescription()` and `directInvokeAlgorithm()`
3. Register in `js/modules/moduleindex.js`
4. Add tests to `test/module_tests.json`

## C++ Development

WASM build uses CMake with Emscripten:
```bash
cd build/wasm
../cmake.sh .     # Configure (uses emscripten toolchain)
make -j4          # Build
```

Key C++ files:
- `cpp/bisExportedFunctions.cpp` - Functions exported to JS
- `cpp/bisImageAlgorithms.txx` - Image processing algorithms
- `cpp/CMakeLists.txt` - Build configuration
