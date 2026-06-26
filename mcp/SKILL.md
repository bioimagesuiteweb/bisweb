---
name: bisweb
description: "Process and view medical images (NIfTI, DICOM) using BioImage Suite Web. Trigger on: view image, open viewer, show image, display image, displayImage, editImage, dualDisplayImage, displayOverlay, open editor, compare images, overlay image, smooth image, segment image, mask image, threshold image, resample image, flip image, normalize image, get image info, header info, run bisweb module, process image, help, bisweb help, or any neuroimaging/medical image task."
---

# bisweb

Use the `bisweb-mcp` MCP server to process and view medical images. All tools
operate on file paths only — image data never passes through Claude.

## help command

When the user types `help` (alone, in any case):
- Call `list_modules` and present the enabled modules as a numbered list with one-line descriptions
- Then list the viewer commands (see table below) with their required and optional arguments
- Present it all as a concise reference the user can read at a glance

When the user types `help <modulename>` (e.g. `help smoothimage`, `help SmoothImage`):
- Call `describe_module` with the lowercased module name and present the full output

## Viewer commands

| Command | Alias | Required | Optional |
|---------|-------|----------|---------|
| `open_viewer` | `displayImage` | `image` | `overlay` |
| `open_editor` | `editImage` | `image` | `overlay` |
| `open_overlay_viewer` | `displayOverlay` | `image`, `overlay` | — |
| `open_dual_viewer` | `dualDisplayImage` | `image`, `image2` | `overlay`, `overlay2` |

All paths must be absolute. The MCP server starts `gulp serve` automatically if needed.
Viewers open in a browser tab (WebGL required).

## Tool reference

| Tool | When to use |
|------|-------------|
| `list_modules` | Show available processing modules with one-line descriptions |
| `describe_module` | Get full argument list for a module before running it |
| `run_module` | Run a processing module (smooth, segment, mask, threshold, etc.) |
| `get_image_info` | Read image header: dimensions, spacing, data type, orientation |

## First steps

When the user asks about an image file, call `get_image_info` first to confirm
the file exists and understand its dimensions, spacing, and data type before
suggesting processing steps.

Call `describe_module` before `run_module` to check required arguments,
defaults, and allowed values for a specific module.

## Running a module

Always call `describe_module` first to get the exact argument names. Then call
`run_module` with the `module` name and an `args` object whose keys are the
CLI flags (e.g. `"--input"`, `"--output"`, `"--sigma"`):

```json
{
  "module": "smoothimage",
  "args": {
    "--input":  "/abs/path/in.nii.gz",
    "--output": "/abs/path/out.nii.gz",
    "--sigma":  "2.0",
    "--inmm":   "true"
  }
}
```

Add `"--debug": "true"` for verbose output, or `"--slicerprogress": "true"`
for structured XML progress messages in the output.

Output paths should be absolute. If the user does not specify an output path,
suggest one derived from the input (e.g. `in_smooth.nii.gz` next to `in.nii.gz`).

## Common workflows

**Check an image:**  
`get_image_info` → report dimensions, spacing, data type to user

**Smooth an image:**  
`describe_module(smoothimage)` → `run_module(smoothimage, {--input, --output, --sigma})`

**Segment an image:**  
`get_image_info` first → `describe_module(segmentimage)` → `run_module(...)`

**Mask an image:**  
`run_module(maskimage, {--input, --mask, --output})`

**View an image:**  
`open_viewer({image: "/path/to/image.nii.gz"})` or `displayImage`

## Notes

- Module names are case-insensitive (`smoothImage`, `SMOOTHIMAGE`, and `smoothimage` all work)
- All file paths must be absolute
- If a module is not listed by `help`, it may be disabled — tell the user to
  set `enable: true` in `mcp/module_config.json` and restart the MCP server
