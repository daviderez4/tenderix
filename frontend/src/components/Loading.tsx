export function Loading({ text = 'טוען...' }: { text?: string }) {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <span>{text}</span>
    </div>
  );
}
