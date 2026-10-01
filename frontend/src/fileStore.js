// Simple module-level store for passing File objects between pages.
// React Router state cannot reliably serialize File/Blob objects,
// so we hold them here instead.

let _file = null;
let _url  = null;

export function setAnalysisInput(file, url) {
  _file = file || null;
  _url  = url  || null;
}

export function getAnalysisInput() {
  return { file: _file, url: _url };
}

export function clearAnalysisInput() {
  _file = null;
  _url  = null;
}
