import type { TooltipProps } from 'recharts';

export default function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: '#1A2028',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 12,
        color: '#F5F7FA',
      }}
    >
      {label && (
        <div style={{ marginBottom: 4, fontWeight: 600, color: '#F5F7FA' }}>
          {label}
        </div>
      )}
      {payload.map((entry, index) => (
        <div key={index} style={{ color: entry.color || '#F5F7FA' }}>
          {entry.name} : {entry.value}
        </div>
      ))}
    </div>
  );
}
