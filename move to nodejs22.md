# Node.js 22 Migration Guide for BioImage Suite Web

This document outlines the changes needed to make bisweb compatible with Node.js 22.

## Code Changes Required

### 1. Buffer Constructor (Critical)

**File:** `js/core/bis_coregenericio.js:78`

```javascript
// Current (deprecated, will warn)
return new Buffer(cdata);

// Should be
return Buffer.from(cdata);
```

The fallback to `new Buffer()` on line 78 should be removed since `Buffer.from()` has been available since Node.js 4.5.

### 2. `request` Module (Deprecated)

**Files:** `js/node/bis_externals.js:12`, `js/core/bis_coregenericio.js:537`

The `request` package (v2.88.0) has been deprecated since 2020. Replace with:
- `node-fetch` (already in dependencies) for simple requests
- `undici` (built into Node.js 22) for better performance
- `axios` as a drop-in replacement

### 3. `node-fetch` v2 (ESM Issues)

**File:** `js/node/bis_externals.js:18`

```javascript
global.fetch = require('node-fetch');
```

Node.js 22 has built-in `fetch`. You can:
- Remove this line entirely (use native fetch)
- Or update to `node-fetch` v3 (ESM only, requires code changes)

### 4. String.prototype.substr (Deprecated)

Multiple files use `.substr()` which is deprecated. Replace with `.substring()` or `.slice()`:

| File | Line |
|------|------|
| `js/webcomponents/bisweb_electrodegridelement.js` | 455 |
| `js/webcomponents/bisweb_paravisionimportelement.js` | 270 |
| `js/webcomponents/bisweb_lightapplication.js` | 59 |
| `js/webcomponents/bisweb_atlastoolelement.js` | 126, 127 |
| `js/webcomponents/bisweb_collectionelement.js` | 134, 173, 284 |
| `js/webcomponents/bisweb_surfacecontrolelement.js` | 202 |
| `js/webcomponents/bisweb_landmarkcontrolelement.js` | 533 |

### 5. assert.equal (Deprecated in Tests)

**Files:** `test/test_*.js`

`assert.equal()` uses loose equality. Replace with `assert.strictEqual()` for Node.js 22 best practices.

---

## Package.json Dependency Updates

| Package | Current | Issue | Recommendation |
|---------|---------|-------|----------------|
| `request` | 2.88.0 | Deprecated | Replace with `undici` or native fetch |
| `node-fetch` | 2.6.1 | v2 is CJS, v3 is ESM-only | Use native fetch (Node 22 built-in) |
| `rimraf` | 2.6.2 | Old API | Update to v5+ (API changed) |
| `glob` | 7.1.6 | v9+ has breaking changes | Update carefully, API changed |
| `mocha` | 5.2.0 | Very old | Update to v10+ |
| `eslint` | 6.4.0 | Old | Update to v8+ |
| `webpack` | 4.28.1 | Old | Consider webpack 5 |
| `colors` | 1.1.2 | Had supply chain attack | Update to 1.4.0 or use `chalk` |
| `uglify-es` | 3.3.9 | Unmaintained | Use `terser` instead |

---

## Summary of Priority Changes

### High Priority (Breaking)

1. Remove `new Buffer()` fallback in `js/core/bis_coregenericio.js`
2. Replace `request` module with native fetch or undici
3. Update `rimraf` and `glob` (API changes in newer versions)

### Medium Priority (Deprecation Warnings)

4. Replace `.substr()` with `.substring()` or `.slice()`
5. Remove `node-fetch` polyfill (use native)
6. Update `assert.equal` to `assert.strictEqual` in tests

### Low Priority (Maintenance)

7. Update other outdated dependencies
8. Replace `uglify-es` with `terser`
9. Consider updating `colors` due to past security issue

---

## References

- [Node.js Deprecated APIs](https://nodejs.org/api/deprecations.html)
- [Node.js 22 Changelog](https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V22.md)
- [Node.js 22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0)
