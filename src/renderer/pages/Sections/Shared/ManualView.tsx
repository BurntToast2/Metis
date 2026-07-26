interface ManualViewProps {
  cmmId: number;
  page: number;
}

export function ManualView({ cmmId, page }: ManualViewProps) {
  return (
    <div className="manual-view">
      <embed
        key={page}
        src={`cmm-asset://asset/${cmmId}/cmm.pdf#page=${page}`}
        type="application/pdf"
        className="manual-view__embed"
      />
    </div>
  );
}