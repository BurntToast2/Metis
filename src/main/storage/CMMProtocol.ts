import { protocol, net } from 'electron';
import { pathToFileURL } from 'url';
import { getCmmPdfPath, getCmmCoverPath, getCmmSectionPreviewPath } from './CMMPaths';


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
    const pathname = url.pathname.replace(/^\//, ''); 

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

    const sectionMatch = pathname.match(/^(\d+)\/sections\/([\w-]+)\.png$/);
    if (sectionMatch) {
      const id = Number(sectionMatch[1]);
      const sectionId = sectionMatch[2];
      const filePath = getCmmSectionPreviewPath(id, sectionId);
      try {
        return await net.fetch(pathToFileURL(filePath).toString());
      } catch (err) {
        console.error(`cmm-asset: failed to read section preview ${filePath}`, err);
        return new Response('Asset not found', { status: 404 });
      }
    }

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