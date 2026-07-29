// Maps a section ID to the "kind" folder its extraction pipeline saves
// under (see getCmmExtractedSectionPath usage in each runXExtraction).
// This is the same mapping currently duplicated inline in the
// has-extracted-section IPC handler — pulled out here so
// reExtractSingleTask can share it rather than hardcoding a third copy.
// Worth eventually pointing that handler at this same export instead of
// its own inline object, though I haven't touched that file since it
// wasn't asked for.
export const SECTION_EXTRACTION_KIND: Record<string, string> = {
  'testing-fault-isolation': 'testing',
  disassembly: 'disassembly',
  cleaning: 'cleaning',
  'inspection-check': 'inspection',
  repairs: 'repairs',
};