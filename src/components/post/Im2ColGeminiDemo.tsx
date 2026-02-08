import { useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'conv' | 'im2col';

const IMAGE_SIZE = 5;
const KERNEL_SIZE = 2;
const KERNEL_VECTOR_SIZE = KERNEL_SIZE * KERNEL_SIZE;
const OUTPUT_SIZE = IMAGE_SIZE - KERNEL_SIZE + 1;
const TOTAL_STEPS = OUTPUT_SIZE * OUTPUT_SIZE;

function buildImage(size: number): number[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (x + y) % 10),
  );
}

function buildKernel(size: number): number[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (x * y + 1) % 5),
  );
}

function buildIm2Col(image: number[][]): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y <= IMAGE_SIZE - KERNEL_SIZE; y += 1) {
    for (let x = 0; x <= IMAGE_SIZE - KERNEL_SIZE; x += 1) {
      const row: number[] = [];
      for (let ky = 0; ky < KERNEL_SIZE; ky += 1) {
        for (let kx = 0; kx < KERNEL_SIZE; kx += 1) {
          row.push(image[y + ky][x + kx]);
        }
      }
      rows.push(row);
    }
  }
  return rows;
}

function dot(row: number[], col: number[]): number {
  let sum = 0;
  for (let i = 0; i < row.length; i += 1) {
    sum += row[i] * col[i];
  }
  return sum;
}

export default function Im2ColGeminiDemo() {
  const [mode, setMode] = useState<Mode>('conv');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const image = useMemo(() => buildImage(IMAGE_SIZE), []);
  const kernel = useMemo(() => buildKernel(KERNEL_SIZE), []);
  const kernelVector = useMemo(() => kernel.flat(), [kernel]);
  const im2colRows = useMemo(() => buildIm2Col(image), [image]);
  const results = useMemo(
    () => im2colRows.map(row => dot(row, kernelVector)),
    [im2colRows, kernelVector],
  );

  const matrixRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const resultColumnRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setStep(prev => {
        if (prev >= TOTAL_STEPS - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (mode !== 'im2col') return;
    const options: ScrollIntoViewOptions = {
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    };
    matrixRowRefs.current[step]?.scrollIntoView(options);
    resultColumnRefs.current[step]?.scrollIntoView(options);
  }, [mode, step]);

  const currentX = step % OUTPUT_SIZE;
  const currentY = Math.floor(step / OUTPUT_SIZE);
  const currentResult = results[step] ?? 0;
  const activePatch = im2colRows[step] ?? [];

  const reset = () => {
    setIsPlaying(false);
    setStep(0);
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    reset();
  };

  const stepOnce = () => {
    setIsPlaying(false);
    setStep(prev => (prev + 1 >= TOTAL_STEPS ? 0 : prev + 1));
  };

  const handleSlider = (value: number) => {
    setIsPlaying(false);
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, value)));
  };

  return (
    <section className="im2col-viz">
      <header className="im2col-viz__header">
        <div>
          <h3>im2col Convolution Visualizer</h3>
          <p>
            {KERNEL_SIZE}x{KERNEL_SIZE} kernel on a {IMAGE_SIZE}x{IMAGE_SIZE} image.
            Every step computes one full receptive field dot-product and stores one output value.
          </p>
        </div>
        <div className="im2col-viz__modes">
          <button
            type="button"
            className={mode === 'conv' ? 'is-active' : ''}
            onClick={() => switchMode('conv')}
          >
            Standard Conv
          </button>
          <button
            type="button"
            className={mode === 'im2col' ? 'is-active' : ''}
            onClick={() => switchMode('im2col')}
          >
            im2col / GEMM
          </button>
        </div>
      </header>

      <div className="im2col-viz__controls">
        <div className="im2col-viz__buttons">
          <button type="button" onClick={() => setIsPlaying(prev => !prev)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={stepOnce}>
            Step
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
        <label>
          <span>
            Step {step + 1} / {TOTAL_STEPS}
          </span>
          <input
            type="range"
            min={0}
            max={TOTAL_STEPS - 1}
            value={step}
            onChange={event => handleSlider(Number(event.currentTarget.value))}
          />
        </label>
        <p className="im2col-viz__status">
          Output[{currentY}, {currentX}] = dot(patch #{step}, kernel) = {currentResult}
        </p>
      </div>

      {mode === 'conv' ? (
        <div className="conv-layout">
          <article className="demo-panel">
            <p className="panel-label">Input Image ({IMAGE_SIZE} x {IMAGE_SIZE})</p>
            <div
              className="cell-grid image-grid"
              style={{ gridTemplateColumns: `repeat(${IMAGE_SIZE}, minmax(0, 1fr))` }}
            >
              {image.map((row, y) =>
                row.map((value, x) => {
                  const active =
                    x >= currentX &&
                    x < currentX + KERNEL_SIZE &&
                    y >= currentY &&
                    y < currentY + KERNEL_SIZE;
                  return (
                    <span key={`img-${y}-${x}`} className={active ? 'is-active' : ''}>
                      {value}
                    </span>
                  );
                }),
              )}
            </div>
          </article>

          <article className="demo-panel">
            <p className="panel-label">Kernel ({KERNEL_SIZE} x {KERNEL_SIZE})</p>
            <div
              className="cell-grid kernel-grid"
              style={{ gridTemplateColumns: `repeat(${KERNEL_SIZE}, minmax(0, 1fr))` }}
            >
              {kernel.map((row, y) =>
                row.map((value, x) => (
                  <span key={`kernel-${y}-${x}`} className="is-kernel">
                    {value}
                  </span>
                )),
              )}
            </div>
            <p className="panel-note">One step = one full patch x kernel multiply.</p>
          </article>

          <article className="demo-panel">
            <p className="panel-label">Output Feature Map ({OUTPUT_SIZE} x {OUTPUT_SIZE})</p>
            <div
              className="cell-grid output-grid"
              style={{ gridTemplateColumns: `repeat(${OUTPUT_SIZE}, minmax(0, 1fr))` }}
            >
              {results.map((value, index) => {
                const classes = ['output-cell'];
                if (index < step) classes.push('is-done');
                if (index === step) classes.push('is-current');
                return (
                  <span key={`conv-out-${index}`} className={classes.join(' ')}>
                    {index <= step ? value : ''}
                  </span>
                );
              })}
            </div>
          </article>
        </div>
      ) : (
        <div className="gemm-layout">
          <article className="demo-panel gemm-legend">
            <p className="panel-label">Input Image ({IMAGE_SIZE} x {IMAGE_SIZE})</p>
            <div
              className="legend-image-grid"
              style={{ gridTemplateColumns: `repeat(${IMAGE_SIZE}, minmax(0, 1fr))` }}
            >
              {image.map((row, y) =>
                row.map((value, x) => {
                  const active =
                    x >= currentX &&
                    x < currentX + KERNEL_SIZE &&
                    y >= currentY &&
                    y < currentY + KERNEL_SIZE;
                  return (
                    <span key={`legend-input-${y}-${x}`} className={active ? 'is-active' : ''}>
                      {value}
                    </span>
                  );
                }),
              )}
            </div>
            <p className="legend-caption">Highlighted patch maps to row #{step} in Input Patches.</p>
            <div
              className="legend-row-preview"
              style={{ gridTemplateColumns: `repeat(${KERNEL_VECTOR_SIZE}, minmax(0, 1fr))` }}
            >
              {activePatch.map((value, index) => (
                <span key={`legend-row-preview-${index}`}>{value}</span>
              ))}
            </div>
            <div className="legend-meta">
              <p>Operation: GEMM</p>
              <div>
                <span><i className="dot patch" />Patch</span>
                <span><i className="dot kernel" />Kernel</span>
              </div>
            </div>
          </article>

          <article className="demo-panel gemm-kernel">
            <p className="panel-label">Kernel Matrix ({KERNEL_VECTOR_SIZE} x 1)</p>
            <div className="kernel-column">
              {kernelVector.map((value, index) => (
                <span key={`kernel-col-${index}`}>{value}</span>
              ))}
            </div>
          </article>

          <article className="demo-panel gemm-input">
            <p className="panel-label">Input Patches ({TOTAL_STEPS} x {KERNEL_VECTOR_SIZE})</p>
            <div className="matrix-scroll">
              {im2colRows.map((row, rowIndex) => {
                const rowClasses = ['matrix-row'];
                if (rowIndex === step) rowClasses.push('is-active');
                if (rowIndex < step) rowClasses.push('is-done');
                return (
                  <div
                    key={`im2col-row-${rowIndex}`}
                    className={rowClasses.join(' ')}
                    style={{ gridTemplateColumns: `repeat(${KERNEL_VECTOR_SIZE}, minmax(0, 1fr))` }}
                    ref={node => {
                      matrixRowRefs.current[rowIndex] = node;
                    }}
                  >
                    {row.map((value, cellIndex) => (
                      <span key={`im2col-cell-${rowIndex}-${cellIndex}`}>{value}</span>
                    ))}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="demo-panel gemm-column">
            <p className="panel-label">Result Column ({TOTAL_STEPS} x 1)</p>
            <div className="result-column-scroll">
              {results.map((value, index) => {
                const classes = ['result-column-cell'];
                if (index < step) classes.push('is-done');
                if (index === step) classes.push('is-current');
                return (
                  <span
                    key={`result-col-${index}`}
                    className={classes.join(' ')}
                    ref={node => {
                      resultColumnRefs.current[index] = node;
                    }}
                  >
                    {index <= step ? value : ''}
                  </span>
                );
              })}
            </div>
          </article>

          <article className="demo-panel gemm-output">
            <p className="panel-label">Reshaped Output ({OUTPUT_SIZE} x {OUTPUT_SIZE})</p>
            <div className="output-stage">
              <span className="output-arrow">›</span>
              <div
                className="cell-grid output-grid"
                style={{ gridTemplateColumns: `repeat(${OUTPUT_SIZE}, minmax(0, 1fr))` }}
              >
                {results.map((value, index) => {
                  const classes = ['output-cell'];
                  if (index < step) classes.push('is-done');
                  if (index === step) classes.push('is-current');
                  return (
                    <span key={`gemm-out-${index}`} className={classes.join(' ')}>
                      {index <= step ? value : ''}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="panel-note">
              Row {step} (im2col) x the kernel column writes one output item each step.
            </p>
          </article>
        </div>
      )}

      <style>{`
        .im2col-viz {
          --demo-bg: #040b1c;
          --demo-bg-alt: #061128;
          --demo-border: #1b2d50;
          --demo-border-soft: #142543;
          --demo-text: #dbe7ff;
          --demo-muted: #8ea2c8;
          --demo-patch: #3f75ff;
          --demo-patch-soft: rgba(63, 117, 255, 0.27);
          --demo-kernel: #2eb78f;
          --demo-kernel-soft: rgba(46, 183, 143, 0.24);
          --demo-done: rgba(46, 183, 143, 0.2);

          border: 1px solid var(--demo-border);
          border-radius: 12px;
          background: linear-gradient(180deg, #040b1c 0%, #030817 100%);
          margin: 24px 0;
          padding: 16px;
        }

        .im2col-viz,
        .im2col-viz * {
          box-sizing: border-box;
        }

        .im2col-viz__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .im2col-viz__header h3 {
          margin: 0;
          color: var(--demo-text);
          font-size: 1.02rem;
        }

        .im2col-viz__header p {
          margin: 6px 0 0;
          color: var(--demo-muted);
          font-size: 0.84rem;
          max-width: 52ch;
        }

        .im2col-viz__modes {
          display: inline-flex;
          border: 1px solid var(--demo-border);
          border-radius: 8px;
          background: #060f23;
          overflow: hidden;
          flex-shrink: 0;
        }

        .im2col-viz__modes button {
          border: 0;
          border-right: 1px solid var(--demo-border);
          background: transparent;
          color: var(--demo-muted);
          padding: 8px 11px;
          font-size: 0.75rem;
          cursor: pointer;
          white-space: nowrap;
        }

        .im2col-viz__modes button:last-child {
          border-right: 0;
        }

        .im2col-viz__modes button.is-active {
          background: var(--demo-patch-soft);
          color: var(--demo-text);
        }

        .im2col-viz__controls {
          border: 1px solid var(--demo-border);
          border-radius: 8px;
          background: var(--demo-bg-alt);
          padding: 10px;
          margin-bottom: 12px;
          display: grid;
          gap: 10px;
        }

        .im2col-viz__buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .im2col-viz__buttons button {
          border: 1px solid var(--demo-border);
          border-radius: 6px;
          background: #08162d;
          color: var(--demo-text);
          padding: 6px 10px;
          font-size: 0.76rem;
          cursor: pointer;
        }

        .im2col-viz__controls label {
          display: grid;
          gap: 6px;
          color: var(--demo-muted);
          font-size: 0.76rem;
        }

        .im2col-viz__controls input[type='range'] {
          width: 100%;
          accent-color: var(--demo-patch);
        }

        .im2col-viz__status {
          margin: 0;
          font-size: 0.75rem;
          color: var(--demo-text);
          line-height: 1.4;
        }

        .conv-layout {
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(220px, 1.35fr) minmax(120px, 0.7fr) minmax(220px, 1fr);
        }

        .gemm-layout {
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(0, 1.4fr) 76px minmax(0, 1fr);
          grid-template-rows: auto minmax(0, 1fr);
        }

        .demo-panel {
          border: 1px solid var(--demo-border);
          border-radius: 10px;
          background: #050f22;
          padding: 10px;
          min-width: 0;
        }

        .panel-label {
          margin: 0 0 8px;
          color: var(--demo-muted);
          font-size: 0.69rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 700;
        }

        .panel-note {
          margin: 8px 0 0;
          color: var(--demo-muted);
          font-size: 0.7rem;
          line-height: 1.35;
        }

        .cell-grid {
          display: grid;
          gap: 4px;
        }

        .cell-grid span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 22px;
          border-radius: 4px;
          font-size: 0.7rem;
          border: 1px solid var(--demo-border-soft);
          background: #0b162d;
          color: #6e86b0;
          line-height: 1;
          padding: 0 2px;
        }

        .image-grid span.is-active {
          background: var(--demo-patch-soft);
          border-color: #4d86ff;
          color: var(--demo-text);
        }

        .kernel-grid span.is-kernel {
          background: var(--demo-kernel-soft);
          border-color: #34c49a;
          color: var(--demo-text);
        }

        .output-grid span.output-cell {
          min-height: 35px;
          font-size: 0.73rem;
        }

        .output-grid span.output-cell.is-done {
          background: var(--demo-done);
          border-color: #2eb78f;
          color: #76e7c5;
        }

        .output-grid span.output-cell.is-current {
          background: var(--demo-kernel-soft);
          border-color: #e7f0ff;
          color: var(--demo-text);
          box-shadow: 0 0 0 2px rgba(231, 240, 255, 0.16);
          font-weight: 700;
        }

        .gemm-legend {
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          min-height: 190px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 8px;
        }

        .legend-image-grid {
          display: grid;
          gap: 3px;
          border: 1px dashed var(--demo-border-soft);
          border-radius: 8px;
          background: #041125;
          padding: 8px;
        }

        .legend-image-grid span {
          min-height: 18px;
          border: 1px solid var(--demo-border-soft);
          border-radius: 4px;
          background: #0a152c;
          color: #627aa4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.64rem;
          line-height: 1;
        }

        .legend-image-grid span.is-active {
          background: var(--demo-patch-soft);
          border-color: #4d86ff;
          color: #dce9ff;
          font-weight: 600;
        }

        .legend-caption {
          margin: 0;
          color: var(--demo-muted);
          font-size: 0.69rem;
          line-height: 1.35;
        }

        .legend-row-preview {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 3px;
        }

        .legend-row-preview span {
          min-height: 18px;
          border: 1px solid #4d86ff;
          border-radius: 4px;
          background: var(--demo-patch-soft);
          color: #dce9ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.64rem;
          line-height: 1;
        }

        .legend-meta p {
          margin: 2px 0 4px;
          color: #7f93ba;
          font-size: 0.67rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        .legend-meta div {
          display: flex;
          gap: 12px;
          color: var(--demo-muted);
          font-size: 0.7rem;
        }

        .legend-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .dot.patch {
          background: var(--demo-patch);
        }

        .dot.kernel {
          background: var(--demo-kernel);
        }

        .gemm-kernel {
          grid-column: 2 / 3;
          grid-row: 1 / 2;
        }

        .kernel-column {
          display: grid;
          gap: 3px;
        }

        .kernel-column span {
          height: 20px;
          border: 1px solid #2a6c5d;
          border-radius: 4px;
          background: var(--demo-kernel-soft);
          color: #74e6c3;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.69rem;
          line-height: 1;
        }

        .gemm-input {
          grid-column: 1 / 2;
          grid-row: 2 / 3;
        }

        .matrix-scroll {
          max-height: 390px;
          overflow: auto;
          padding-right: 6px;
        }

        .matrix-row {
          display: grid;
          gap: 3px;
          padding: 3px;
          border-radius: 6px;
          margin-bottom: 3px;
          transition: background-color 0.15s ease, opacity 0.15s ease;
        }

        .matrix-row span {
          min-height: 20px;
          border: 1px solid var(--demo-border-soft);
          border-radius: 4px;
          background: #0a152c;
          color: #627aa4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.66rem;
          line-height: 1;
        }

        .matrix-row.is-active {
          background: var(--demo-patch-soft);
          box-shadow: inset 0 0 0 1px rgba(77, 134, 255, 0.55);
        }

        .matrix-row.is-active span {
          border-color: #4d86ff;
          color: #dce9ff;
          font-weight: 600;
        }

        .matrix-row.is-done {
          opacity: 0.42;
        }

        .gemm-column {
          grid-column: 2 / 3;
          grid-row: 2 / 3;
        }

        .result-column-scroll {
          max-height: 390px;
          overflow: auto;
          display: grid;
          gap: 3px;
          padding-right: 2px;
        }

        .result-column-cell {
          min-height: 20px;
          border: 1px solid var(--demo-border-soft);
          border-radius: 4px;
          background: #0a152c;
          color: #627aa4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.66rem;
          line-height: 1;
        }

        .result-column-cell.is-done {
          background: var(--demo-done);
          border-color: #2eb78f;
          color: #72e1c0;
        }

        .result-column-cell.is-current {
          background: var(--demo-kernel-soft);
          border-color: #e7f0ff;
          color: #e7f0ff;
          font-weight: 700;
        }

        .gemm-output {
          grid-column: 3 / 4;
          grid-row: 2 / 3;
        }

        .output-stage {
          display: grid;
          grid-template-columns: 16px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
        }

        .output-arrow {
          color: #46649a;
          font-size: 1.7rem;
          line-height: 1;
          text-align: center;
          user-select: none;
        }

        .matrix-scroll::-webkit-scrollbar,
        .result-column-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .matrix-scroll::-webkit-scrollbar-thumb,
        .result-column-scroll::-webkit-scrollbar-thumb {
          background: #2d4674;
          border-radius: 6px;
        }

        .matrix-scroll::-webkit-scrollbar-track,
        .result-column-scroll::-webkit-scrollbar-track {
          background: #08152b;
        }

        @media (max-width: 1180px) {
          .im2col-viz__header {
            flex-direction: column;
          }

          .im2col-viz__modes {
            width: 100%;
          }

          .im2col-viz__modes button {
            flex: 1;
          }

          .conv-layout {
            grid-template-columns: 1fr;
          }

          .gemm-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
          }

          .gemm-legend,
          .gemm-kernel,
          .gemm-input,
          .gemm-column,
          .gemm-output {
            grid-column: auto;
            grid-row: auto;
          }

          .kernel-column {
            grid-template-columns: repeat(8, minmax(0, 1fr));
          }

          .result-column-scroll {
            grid-template-columns: repeat(7, minmax(0, 1fr));
            max-height: none;
          }

          .output-stage {
            grid-template-columns: 1fr;
          }

          .output-arrow {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
