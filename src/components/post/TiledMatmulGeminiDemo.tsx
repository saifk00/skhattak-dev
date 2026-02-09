import { useEffect, useMemo, useState } from 'react';

type TileRange = {
  row: [number, number];
  col: [number, number];
};

type MatrixCellProps = {
  row: number;
  col: number;
  rows: number;
  cols: number;
  value?: number | null;
  activeRange?: TileRange;
  tone: 'a' | 'b' | 'c';
  tileProgress?: number;
  showProgressLabel?: boolean;
};

type MatrixGridProps = {
  rows: number;
  cols: number;
  title: string;
  values?: Array<Array<number | null>>;
  activeRange?: TileRange;
  tone: 'a' | 'b' | 'c';
  tileProgressMap?: number[][];
  showProgressLabels?: boolean;
};

const TILE_SIZE = 4;
const M = 7;
const N = 6;
const K = 9;

const ROW_TILES = Math.ceil(M / TILE_SIZE);
const INNER_TILES = Math.ceil(N / TILE_SIZE);
const COL_TILES = Math.ceil(K / TILE_SIZE);
const TOTAL_STEPS = ROW_TILES * COL_TILES * INNER_TILES;

function buildMatrix(rows: number, cols: number, seed: number): number[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ((r * (seed + 2) + c * (seed + 3) + seed) % 9) + 1),
  );
}

function getTileRange(tileIndex: number, maxSize: number): [number, number] {
  const start = tileIndex * TILE_SIZE;
  const end = Math.min(start + TILE_SIZE - 1, maxSize - 1);
  return [start, end];
}

function buildPartialC(
  matrixA: number[][],
  matrixB: number[][],
  step: number,
): Array<Array<number | null>> {
  const out: Array<Array<number | null>> = Array.from({ length: M }, () =>
    Array.from({ length: K }, () => null),
  );

  for (let rowTile = 0; rowTile < ROW_TILES; rowTile += 1) {
    const rowRange = getTileRange(rowTile, M);
    for (let colTile = 0; colTile < COL_TILES; colTile += 1) {
      const colRange = getTileRange(colTile, K);
      const contributions = tileContributionCount(step, rowTile, colTile);
      if (contributions <= 0) continue;

      for (let r = rowRange[0]; r <= rowRange[1]; r += 1) {
        for (let c = colRange[0]; c <= colRange[1]; c += 1) {
          let sum = 0;
          for (let innerTile = 0; innerTile < contributions; innerTile += 1) {
            const innerRange = getTileRange(innerTile, N);
            for (let n = innerRange[0]; n <= innerRange[1]; n += 1) {
              sum += matrixA[r][n] * matrixB[n][c];
            }
          }
          out[r][c] = sum;
        }
      }
    }
  }

  return out;
}

function inRange(index: number, bounds?: [number, number]): boolean {
  if (!bounds) return false;
  return index >= bounds[0] && index <= bounds[1];
}

function tileContributionCount(step: number, rowTile: number, colTile: number): number {
  const tileIndex = rowTile * COL_TILES + colTile;
  const baseStep = tileIndex * INNER_TILES;
  const delta = step - baseStep + 1;
  if (delta <= 0) return 0;
  return Math.min(INNER_TILES, delta);
}

function matrixCellClasses(
  tone: MatrixCellProps['tone'],
  isActive: boolean,
  tileProgress: number,
): string {
  if (tone === 'c') {
    if (isActive) {
      if (tileProgress >= INNER_TILES) return 'cell cell--active-c-final';
      if (tileProgress > 0) return 'cell cell--active-c-partial';
      return 'cell cell--active-c-partial';
    }
    if (tileProgress >= INNER_TILES) return 'cell cell--done-final';
    if (tileProgress > 0) return 'cell cell--done-partial';
    return 'cell';
  }

  if (isActive) {
    if (tone === 'a') return 'cell cell--active-a';
    return 'cell cell--active-b';
  }
  return 'cell';
}

function MatrixCell({
  row,
  col,
  rows,
  cols,
  value,
  activeRange,
  tone,
  tileProgress = 0,
  showProgressLabel = false,
}: MatrixCellProps) {
  const isActive = inRange(row, activeRange?.row) && inRange(col, activeRange?.col);
  const tileEdgeRight = (col + 1) % TILE_SIZE === 0 && col + 1 < cols;
  const tileEdgeBottom = (row + 1) % TILE_SIZE === 0 && row + 1 < rows;
  const cls = matrixCellClasses(tone, isActive, tileProgress);

  return (
    <div
      className={cls}
      style={{
        borderRightWidth: tileEdgeRight ? 2 : 1,
        borderBottomWidth: tileEdgeBottom ? 2 : 1,
      }}
    >
      {typeof value === 'number' ? <span>{value}</span> : null}
      {showProgressLabel ? <em>{tileProgress}/{INNER_TILES}</em> : null}
    </div>
  );
}

function MatrixGrid({
  rows,
  cols,
  title,
  values,
  activeRange,
  tone,
  tileProgressMap,
  showProgressLabels = false,
}: MatrixGridProps) {
  return (
    <article className="matrix-card">
      <p className="matrix-title">
        {title} <span>({rows} x {cols})</span>
      </p>
      <div
        className="matrix-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows * cols }).map((_, index) => {
          const r = Math.floor(index / cols);
          const c = index % cols;
          const tileR = Math.floor(r / TILE_SIZE);
          const tileC = Math.floor(c / TILE_SIZE);
          const tileProgress = tileProgressMap?.[tileR]?.[tileC] ?? 0;
          const isLabelCell = showProgressLabels && r % TILE_SIZE === 0 && c % TILE_SIZE === 0;
          return (
            <MatrixCell
              key={`${title}-${r}-${c}`}
              row={r}
              col={c}
              rows={rows}
              cols={cols}
              value={values?.[r]?.[c]}
              activeRange={activeRange}
              tone={tone}
              tileProgress={tileProgress}
              showProgressLabel={isLabelCell}
            />
          );
        })}
      </div>
    </article>
  );
}

export default function TiledMatmulGeminiDemo() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const matrixA = useMemo(() => buildMatrix(M, N, 1), []);
  const matrixB = useMemo(() => buildMatrix(N, K, 3), []);

  const { rowTile, colTile, innerTile } = useMemo(() => {
    const inner = step % INNER_TILES;
    const col = Math.floor(step / INNER_TILES) % COL_TILES;
    const row = Math.floor(step / (INNER_TILES * COL_TILES));
    return { rowTile: row, colTile: col, innerTile: inner };
  }, [step]);

  const activeA: TileRange = {
    row: getTileRange(rowTile, M),
    col: getTileRange(innerTile, N),
  };
  const activeB: TileRange = {
    row: getTileRange(innerTile, N),
    col: getTileRange(colTile, K),
  };
  const activeC: TileRange = {
    row: getTileRange(rowTile, M),
    col: getTileRange(colTile, K),
  };

  const cTileProgress = useMemo(
    () =>
      Array.from({ length: ROW_TILES }, (_, r) =>
        Array.from({ length: COL_TILES }, (_, c) => tileContributionCount(step, r, c)),
      ),
    [step],
  );

  const partialC = useMemo(() => buildPartialC(matrixA, matrixB, step), [matrixA, matrixB, step]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setStep(prev => (prev + 1) % TOTAL_STEPS);
    }, 850);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const reset = () => {
    setIsPlaying(false);
    setStep(0);
  };

  const prevStep = () => {
    setIsPlaying(false);
    setStep(prev => (prev - 1 + TOTAL_STEPS) % TOTAL_STEPS);
  };

  const nextStep = () => {
    setIsPlaying(false);
    setStep(prev => (prev + 1) % TOTAL_STEPS);
  };

  return (
    <section className="tile-demo">
      <header className="tile-demo__header">
        <div>
          <h3>Tiled MatMul Visualizer</h3>
          <p>
            4x4 primitive tiling for <code>A(7x6) x B(6x9) = C(7x9)</code>.
            Each step shows one tile contribution: <code>C[r,c] += A[r,n] x B[n,c]</code>.
          </p>
        </div>
        <div className="tile-demo__buttons">
          <button type="button" onClick={prevStep}>
            Prev
          </button>
          <button type="button" onClick={() => setIsPlaying(prev => !prev)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={nextStep}>
            Next
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </header>

      <div className="tile-demo__slider">
        <label htmlFor="tile-step-slider">
          Step {step + 1} / {TOTAL_STEPS}
        </label>
        <input
          id="tile-step-slider"
          type="range"
          min={0}
          max={TOTAL_STEPS - 1}
          value={step}
          onChange={event => {
            setIsPlaying(false);
            setStep(Number(event.currentTarget.value));
          }}
        />
      </div>

      <p className="tile-demo__status">
        Updating tile C[{rowTile + 1}, {colTile + 1}] using inner tile {innerTile + 1}/{INNER_TILES}
        from A[{rowTile + 1}, {innerTile + 1}] and B[{innerTile + 1}, {colTile + 1}].
      </p>

      <div className="tile-demo__layout-wrap">
        <div className="tile-demo__layout">
          <div className="slot-a">
            <MatrixGrid
              rows={M}
              cols={N}
              title="Matrix A"
              values={matrixA}
              activeRange={activeA}
              tone="a"
            />
          </div>
          <div className="slot-b">
            <MatrixGrid
              rows={N}
              cols={K}
              title="Matrix B"
              values={matrixB}
              activeRange={activeB}
              tone="b"
            />
          </div>
          <div className="slot-c">
            <MatrixGrid
              rows={M}
              cols={K}
              title="Matrix C"
              values={partialC}
              activeRange={activeC}
              tone="c"
              tileProgressMap={cTileProgress}
              showProgressLabels
            />
          </div>
        </div>
      </div>

      <style>{`
        .tile-demo {
          --demo-bg: #050c1d;
          --demo-bg-alt: #071129;
          --demo-border: #1a2d50;
          --demo-border-soft: #152544;
          --demo-text: #dbe7ff;
          --demo-muted: #8fa2c7;
          --demo-cell: #0c162b;
          --demo-cell-border: #172846;
          --demo-tile-line: #27406c;
          --demo-a: #c4873a;
          --demo-a-soft: rgba(196, 135, 58, 0.25);
          --demo-b: #2eb58e;
          --demo-b-soft: rgba(46, 181, 142, 0.25);
          --demo-c: #4f86ff;
          --demo-c-soft: rgba(79, 134, 255, 0.27);
          --demo-c-done: rgba(46, 181, 142, 0.18);

          border: 1px solid var(--demo-border);
          border-radius: 12px;
          background: linear-gradient(180deg, #040b1c 0%, #030818 100%);
          padding: 16px;
          margin: 24px 0;
        }

        .tile-demo,
        .tile-demo * {
          box-sizing: border-box;
        }

        .tile-demo__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .tile-demo__header h3 {
          margin: 0;
          font-size: 1.02rem;
          color: var(--demo-text);
        }

        .tile-demo__header p {
          margin: 6px 0 0;
          font-size: 0.82rem;
          color: var(--demo-muted);
          max-width: 66ch;
        }

        .tile-demo__header p code {
          color: #e8f0ff;
          background: rgba(15, 30, 58, 0.82);
          border: 1px solid var(--demo-border-soft);
          border-radius: 4px;
          padding: 1px 4px;
        }

        .tile-demo__buttons {
          display: inline-flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .tile-demo__buttons button {
          border: 1px solid var(--demo-border);
          border-radius: 8px;
          padding: 8px 11px;
          font-size: 0.75rem;
          color: var(--demo-muted);
          background: #061126;
          cursor: pointer;
          min-width: 60px;
        }

        .tile-demo__buttons button:hover {
          color: var(--demo-text);
          border-color: var(--demo-c);
          background: rgba(79, 134, 255, 0.12);
        }

        .tile-demo__slider {
          margin-bottom: 8px;
        }

        .tile-demo__slider label {
          display: flex;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--demo-muted);
          margin-bottom: 8px;
        }

        .tile-demo__slider input[type='range'] {
          width: 100%;
          accent-color: #4f86ff;
          cursor: pointer;
        }

        .tile-demo__status {
          margin: 0 0 14px;
          text-align: center;
          color: #b6c9ee;
          font-size: 0.79rem;
          line-height: 1.4;
        }

        .tile-demo__layout-wrap {
          overflow-x: auto;
          padding-bottom: 6px;
          display: flex;
          justify-content: center;
        }

        .tile-demo__layout {
          width: max-content;
          display: grid;
          grid-template-columns: max-content max-content;
          grid-template-areas:
            '. b'
            'a c';
          gap: 14px;
          align-items: start;
        }

        .slot-a {
          grid-area: a;
        }

        .slot-b {
          grid-area: b;
        }

        .slot-c {
          grid-area: c;
        }

        .matrix-card {
          border: 1px solid var(--demo-border-soft);
          border-radius: 10px;
          background: linear-gradient(180deg, var(--demo-bg-alt), var(--demo-bg));
          padding: 9px;
        }

        .matrix-title {
          margin: 0 0 8px;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a9bee7;
        }

        .matrix-title span {
          color: var(--demo-muted);
        }

        .matrix-grid {
          --cell-size: 28px;
          display: grid;
          gap: 2px;
        }

        .cell {
          position: relative;
          width: var(--cell-size);
          height: var(--cell-size);
          border-style: solid;
          border-color: var(--demo-cell-border);
          background: var(--demo-cell);
          color: #9db1d7;
          font-size: 0.62rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          line-height: 1;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .cell--active-a {
          background: var(--demo-a-soft);
          border-color: color-mix(in srgb, var(--demo-a) 70%, white);
          color: #ffe6c4;
        }

        .cell--active-b {
          background: var(--demo-b-soft);
          border-color: color-mix(in srgb, var(--demo-b) 70%, white);
          color: #d9ffef;
        }

        .cell--active-c-partial {
          background: var(--demo-c-soft);
          border-color: color-mix(in srgb, var(--demo-c) 52%, white);
          color: #dbe8ff;
        }

        .cell--active-c-final {
          background: color-mix(in srgb, var(--demo-c) 34%, #0c1831);
          border-color: color-mix(in srgb, var(--demo-c) 76%, white);
          color: #eef4ff;
          box-shadow: inset 0 0 0 1px rgba(132, 174, 255, 0.35);
        }

        .cell--done-partial {
          background: color-mix(in srgb, var(--demo-c) 14%, #0b162d);
          border-color: color-mix(in srgb, var(--demo-c) 38%, var(--demo-cell-border));
          color: #b8ccef;
        }

        .cell--done-final {
          background: color-mix(in srgb, var(--demo-c) 22%, #0b1730);
          border-color: color-mix(in srgb, var(--demo-b) 52%, var(--demo-cell-border));
          color: #dfeaff;
        }

        .cell em {
          position: absolute;
          top: 1px;
          left: 1px;
          background: rgba(7, 13, 26, 0.9);
          border: 1px solid rgba(71, 109, 174, 0.56);
          border-radius: 3px;
          padding: 0 2px;
          font-family: var(--font-mono);
          font-size: 0.47rem;
          font-style: normal;
          color: #bfd2f8;
          line-height: 1.2;
          pointer-events: none;
        }

        @media (max-width: 780px) {
          .tile-demo__header {
            flex-direction: column;
          }

          .tile-demo__buttons {
            justify-content: flex-start;
          }

          .matrix-grid {
            --cell-size: 23px;
          }
        }
      `}</style>
    </section>
  );
}
