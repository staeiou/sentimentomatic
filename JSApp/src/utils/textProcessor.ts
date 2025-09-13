/**
 * Text processing utilities for sentiment analysis
 */

export function processTextInput(text: string): string[] {
  // Split by lines and filter out empty lines
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function validateLine(line: string): { valid: boolean; error?: string } {
  if (line.length === 0) {
    return { valid: false, error: 'Empty line' };
  }
  
  if (line.length > 2500) {
    return { valid: false, error: 'Line too long (max 2500 characters)' };
  }
  
  return { valid: true };
}

export function sanitizeText(text: string): string {
  // Basic HTML entity decode and cleanup
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// COPIED DIRECTLY FROM FLASK VERSION - WORKING CODE
let cntline: number;

// Global functions for HTML event handlers
declare global {
  interface Window {
    keyup: (obj: HTMLTextAreaElement, e: KeyboardEvent) => void;
    selectionchanged: (obj: HTMLTextAreaElement) => void;
    input_changed: (obj: HTMLTextAreaElement) => void;
    scroll_changed: (obj: HTMLTextAreaElement) => void;
  }
}

// Make functions globally available for HTML event handlers
window.keyup = function keyup(obj: HTMLTextAreaElement, e: KeyboardEvent) {
  if (e.keyCode >= 33 && e.keyCode <= 40) { // arrows ; home ; end ; page up/down
    window.selectionchanged(obj);
  }
}

window.selectionchanged = function selectionchanged(obj: HTMLTextAreaElement) {
  const substr = obj.value.substring(0, obj.selectionStart).split('\n');
  const row = substr.length;
  const col = substr[substr.length - 1].length;
  let tmpstr = '(' + row.toString() + ',' + col.toString() + ')';
  // if selection spans over
  if (obj.selectionStart !== obj.selectionEnd) {
    const substr2 = obj.value.substring(obj.selectionStart, obj.selectionEnd).split('\n');
    const row2 = row + substr2.length - 1;
    const col2 = substr2[substr2.length - 1].length;
    tmpstr += ' - (' + row2.toString() + ',' + col2.toString() + ')';
  }
  // Update status if there's a status input (we don't have one but keeping the structure)
}

window.input_changed = function input_changed(obj_txt: HTMLTextAreaElement) {
  const obj_rownr = obj_txt.parentElement!.parentElement!.getElementsByTagName('textarea')[0] as HTMLTextAreaElement;
  cntline = count_lines(obj_txt.value);
  if (cntline === 0) cntline = 1;
  const tmp_arr = obj_rownr.value.split('\n');
  const cntline_old = parseInt(tmp_arr[tmp_arr.length - 1], 10);
  // if there was a change in line count
  if (cntline !== cntline_old) {
    obj_rownr.cols = cntline.toString().length; // new width of txt_rownr
    populate_rownr(obj_rownr, cntline);
    window.scroll_changed(obj_txt);
  }
  window.selectionchanged(obj_txt);
}

window.scroll_changed = function scroll_changed(obj_txt: HTMLTextAreaElement) {
  const obj_rownr = obj_txt.parentElement!.parentElement!.getElementsByTagName('textarea')[0] as HTMLTextAreaElement;
  scrollsync(obj_txt, obj_rownr);
}

function scrollsync(obj1: HTMLTextAreaElement, obj2: HTMLTextAreaElement) {
  // scroll text in object id1 the same as object id2
  obj2.scrollTop = obj1.scrollTop;
}

function populate_rownr(obj: HTMLTextAreaElement, cntline: number) {
  let tmpstr = '';
  for (let i = 1; i <= cntline; i++) {
    tmpstr = tmpstr + i.toString() + '\n';
  }
  obj.value = tmpstr;
}

function count_lines(txt: string): number {
  if (txt === '') {
    return 1;
  }
  return txt.split('\n').length + 1;
}

// These functions are no longer needed since we use HTML event handlers directly
// The global functions above handle all line numbering functionality

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}