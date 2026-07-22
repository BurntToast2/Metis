import { protocol, net } from 'electron';
import { pathToFileURL } from 'url';
import { getCmmPdfPath, getCmmCoverPath } from './CMMPaths';

/**
 * Must be called BEFORE app.whenReady(), in your main entry file (e.g. main.ts),
 * at module scope — not inside any function that runs after startup.
 *
 * This tells Chromium "cmm-asset:// is a real, secure-ish scheme" before the
 * app's web contents exist. Skipping this step means requests to cmm-asset://
 * get silently blocked or behave inconsistently (e.g. relative paths, CORS).
 */
export function registerCmmAssetSchemeAsPrivileged() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'cmm-asset',
      privileges: {
        standard: true,      // treat like http/https for URL parsing purposes
        secure: true,        // treat as a secure context (needed to load into <img>, fetch, etc. without warnings)
        supportFetchAPI: true,
        stream: true,        // allows returning large files without buffering entirely in memory
      },
    },
  ]);
}

/**
 * Must be called inside app.whenReady(), after the app is ready but before
 * (or as) you create your BrowserWindow.
 *
 * Maps URLs like:
 *   cmm-asset://asset/42/cover.png  -> storage/cmms/42/cover.png
 *   cmm-asset://asset/42/cmm.pdf    -> storage/cmms/42/cmm.pdf
 *
 * NOTE: the id lives in the PATH, not the hostname. A bare numeric hostname
 * (cmm-asset://42/cover.png) gets silently rewritten by Chromium's URL parser
 * into an IPv4-style address (e.g. "0.0.0.42") because we registered this as
 * a `standard` scheme, which uses the same host-parsing rules as http/https.
 * Putting the id in the path avoids that rewrite entirely. The hostname is
 * always the fixed literal "asset" and is otherwise unused.
 */
export function registerCmmAssetProtocolHandler() {
  protocol.handle('cmm-asset', async (request) => {
    const url = new URL(request.url);

    // url.pathname is "/42/cover.png" — split into ["42", "cover.png"]
    const [idSegment, assetName] = url.pathname.replace(/^\//, '').split('/');
    const id = Number(idSegment);

    // Reject anything that isn't a real positive integer id.
    // This is the actual security boundary: we NEVER build a path by joining
    // user-controlled strings onto a directory. We only ever hand back one of
    // two fixed, known-safe paths that cmmPaths.ts computes internally.
    if (!Number.isInteger(id) || id <= 0) {
      return new Response('Invalid CMM id', { status: 400 });
    }

    let filePath: string;
    if (assetName === 'cover.png') {
      filePath = getCmmCoverPath(id);
    } else if (assetName === 'cmm.pdf') {
      filePath = getCmmPdfPath(id);
    } else {
      // Anything else requested (e.g. someone tries cmm-asset://42/../../etc)
      // is rejected outright — assetName has to exactly match a known name.
      return new Response('Unknown asset', { status: 404 });
    }

    // net.fetch on a file:// URL is Electron's recommended way to stream a
    // local file back as a Response — handles content-type, byte ranges
    // (useful for PDFs), and streaming for free.
    //
    // If the file doesn't exist (e.g. this CMM's folder was never created,
    // or asset just isn't there yet), net.fetch rejects. Left uncaught, that
    // surfaces to the renderer as a vague net::ERR_UNEXPECTED. We catch it
    // and return a clean 404 instead so <img onError> etc. can react sanely.
    try {
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      console.error(`cmm-asset: failed to read ${filePath}`, err);
      return new Response('Asset not found', { status: 404 });
    }
  });
}