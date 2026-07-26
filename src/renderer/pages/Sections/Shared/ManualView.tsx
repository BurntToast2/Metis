interface ManualViewProps {
  cmmId: number;
  startPage: number;
}

export function ManualView({ cmmId, startPage }: ManualViewProps) {
  return (
    <div className="tfi-manual-view">
      <embed
        key={startPage}
        src={`cmm-asset://asset/${cmmId}/cmm.pdf#page=${startPage}`}
        type="application/pdf"
        className="tfi-manual-view__embed"
      />
    </div>
  );
}