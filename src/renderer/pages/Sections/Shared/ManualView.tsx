interface ManualViewProps {
  cmmId: number;
  page: number;
}

export function ManualView({ cmmId, page }: ManualViewProps) {
  return (
    <div className="tfi-manual-view">
      <embed
        key={page}
        src={`cmm-asset://asset/${cmmId}/cmm.pdf#page=${page}`}
        type="application/pdf"
        className="tfi-manual-view__embed"
      />
    </div>
  );
}