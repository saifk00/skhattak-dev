import { useState } from 'react';

/**
 * Example interactive component.
 * Embed in any .mdx post with: <CacheCalculator client:visible />
 */
export default function CacheCalculator() {
  const [cacheSize, setCacheSize] = useState(16);
  const [lineSize, setLineSize] = useState(64);
  const [ways, setWays] = useState(2);

  const totalLines = (cacheSize * 1024) / lineSize;
  const sets = totalLines / ways;
  const offsetBits = Math.log2(lineSize);
  const indexBits = Math.log2(sets);
  const tagBits = 32 - offsetBits - indexBits;

  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '24px',
      margin: '24px 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#e6edf3',
    }}>
      <div style={{ fontSize: '0.85em', color: '#8b949e', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Interactive: Cache Geometry Calculator
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9em' }}>
          <span style={{ color: '#8b949e' }}>Cache size (KiB)</span>
          <input type="number" value={cacheSize} onChange={e => setCacheSize(+e.target.value)}
            style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', padding: '8px', color: '#e6edf3', fontSize: '1em' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9em' }}>
          <span style={{ color: '#8b949e' }}>Line size (bytes)</span>
          <input type="number" value={lineSize} onChange={e => setLineSize(+e.target.value)}
            style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', padding: '8px', color: '#e6edf3', fontSize: '1em' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9em' }}>
          <span style={{ color: '#8b949e' }}>Associativity (ways)</span>
          <input type="number" value={ways} onChange={e => setWays(+e.target.value)}
            style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', padding: '8px', color: '#e6edf3', fontSize: '1em' }} />
        </label>
      </div>
      <pre style={{
        background: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: '6px',
        padding: '16px',
        fontSize: '0.88em',
        lineHeight: '1.6',
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        color: '#8b949e',
        margin: 0,
        overflow: 'auto',
      }}>
{`${totalLines} total lines, ${sets} sets

Address decomposition (32 bits):
┌${'─'.repeat(tagBits > 6 ? tagBits : 6)}┬${'─'.repeat(indexBits > 6 ? indexBits : 6)}┬${'─'.repeat(offsetBits > 6 ? offsetBits : 6)}┐
│  Tag${' '.repeat(Math.max(0, (tagBits > 6 ? tagBits : 6) - 5))}│  Index${' '.repeat(Math.max(0, (indexBits > 6 ? indexBits : 6) - 7))}│  Offset${' '.repeat(Math.max(0, (offsetBits > 6 ? offsetBits : 6) - 8))}│
│  ${tagBits} bits${' '.repeat(Math.max(0, (tagBits > 6 ? tagBits : 6) - (tagBits.toString().length + 6)))}│  ${indexBits} bits${' '.repeat(Math.max(0, (indexBits > 6 ? indexBits : 6) - (indexBits.toString().length + 6)))}│  ${offsetBits} bits${' '.repeat(Math.max(0, (offsetBits > 6 ? offsetBits : 6) - (offsetBits.toString().length + 6)))}│
└${'─'.repeat(tagBits > 6 ? tagBits : 6)}┴${'─'.repeat(indexBits > 6 ? indexBits : 6)}┴${'─'.repeat(offsetBits > 6 ? offsetBits : 6)}┘`}
      </pre>
    </div>
  );
}
