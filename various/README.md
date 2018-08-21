lThis directory contains the following:

* `config` -- configuration files for bash, vscode and emacs
* `download` -- this has downloaded versions of emscripten (skeleton) and Eigen
  v3 (complete).
* `wasm` -- this is the minimal set of `binary` outputs for the Web Assembly
    compilation to help a new user get started quickly. We update these
    periodically. (Look at the function get_date inside
    wasm/libbiswasm_wrapper.js to find out when these were compiled.)
* `other` -- files used for the bisweb.yale.edu server (downloads mostly)
* `txt` -- various license files (used when building)
* `examples` -- contains an example external project that links into
  bisweb. See the README.md file in this zip file for more info.
