/**
 * Need to fill the window.process object in production build, otherwise process is undefined
 * This is needed if the plugins are built with Vue
 */
if (import.meta.env.PROD) window.process = { env: import.meta.env };
