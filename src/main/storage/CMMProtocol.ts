import { protocol, net } from 'electron';
import { pathToFileURL } from 'url';
import { getCmmPdfPath, getCmmCoverPath } from './CMMPaths';


export function registerCmmAssetSchemeAsPrivileged() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'cmm-asset',
      privileges: {
        standard: true,      
        secure: true,        
        supportFetchAPI: true,
        stream: true,       
      },
    },
  ]);
}


export function registerCmmAssetProtocolHandler() {
  protocol.handle('cmm-asset', async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\//, ''); // strip leading slash

    // NEW: cmm-asset://asset/preview/<encoded absolute path>
    // Used only for previewing a freshly-selected file before it's been
    // saved as a CMM (i.e. before it has an id). The path comes from
    // webUtils.getPathForFile on a real, user-selected File object — not
    // from arbitrary renderer-supplied strings joined onto a directory.
    if (pathname.startsWith('preview/')) {
      const encodedPath = pathname.slice('preview/'.length);
      const filePath = decodeURIComponent(encodedPath);

      try {
        return await net.fetch(pathToFileURL(filePath).toString());
      } catch (err) {
        console.error(`cmm-asset: failed to preview ${filePath}`, err);
        return new Response('Asset not found', { status: 404 });
      }
    }

    // --- existing id-based logic below, unchanged ---
    const [idSegment, assetName] = pathname.split('/');
    const id = Number(idSegment);

    if (!Number.isInteger(id) || id <= 0) {
      return new Response('Invalid CMM id', { status: 400 });
    }

    let filePath: string;
    if (assetName === 'cover.png') {
      filePath = getCmmCoverPath(id);
    } else if (assetName === 'cmm.pdf') {
      filePath = getCmmPdfPath(id);
    } else {
      return new Response('Unknown asset', { status: 404 });
    }

    try {
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      console.error(`cmm-asset: failed to read ${filePath}`, err);
      return new Response('Asset not found', { status: 404 });
    }
  });
}