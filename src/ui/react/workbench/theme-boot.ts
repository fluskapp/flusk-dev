/**
 * The pre-paint theme restore, inlined into <head> by the root document. The
 * three togglers write localStorage "flusk-theme"; this is the reader — an
 * IDE never forgets its theme. It runs before first paint so the page never
 * flashes the prefers-color-scheme fallback; the tokens.css [data-theme]
 * blocks do the rest. Guarded: private mode has no storage, and only the two
 * values the togglers write may reach the attribute.
 */
export const THEME_BOOT =
	'try{var t=localStorage.getItem("flusk-theme");' +
	'if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}';
