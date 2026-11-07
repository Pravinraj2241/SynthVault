/**
 * Minimal SVG line/area chart.
 *
 * The frontend contract allows only SVG/CSS for visualisations (no chart
 * libraries), so this component draws one series with a solid brand colour,
 * gridlines and axis labels. It renders nothing when there are no points -
 * the caller decides which empty state to show instead.
 *
 * points: [{ label: '20 Sep', value: 3 }]  (already aggregated by the caller)
 */

export default function LineChart({
  points,
  ariaLabel,
  height = 200,
  valueFormatter = (value) => String(value),
}) {
  const data = Array.isArray(points) ? points.filter((point) => point && Number.isFinite(Number(point.value))) : [];
  if (data.length === 0) {
    return null;
  }

  const width = 640;
  const pad = { top: 14, right: 16, bottom: 30, left: 46 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((point) => Number(point.value));
  const yMax = Math.max(1, ...values);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xOf = (index) => pad.left + (data.length > 1 ? index * stepX : innerW / 2);
  const yOf = (value) => pad.top + innerH - (value / yMax) * innerH;

  const linePath = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xOf(index).toFixed(1)} ${yOf(values[index]).toFixed(1)}`)
    .join(' ');
  const baseline = pad.top + innerH;
  const areaPath =
    data.length > 1
      ? `${linePath} L ${xOf(data.length - 1).toFixed(1)} ${baseline.toFixed(1)} L ${pad.left} ${baseline.toFixed(1)} Z`
      : '';

  const gridLineCount = 4;
  const gridLines = Array.from({ length: gridLineCount + 1 }, (_, index) => ({
    y: pad.top + (innerH / gridLineCount) * index,
    value: (yMax / gridLineCount) * (gridLineCount - index),
  }));

  const labelIndexes =
    data.length <= 2
      ? data.map((_, index) => index)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="w-full">
        <title>{ariaLabel}</title>

        {gridLines.map((line) => (
          <g key={`grid-${line.y.toFixed(1)}`}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={line.y.toFixed(1)}
              y2={line.y.toFixed(1)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={pad.left - 8} y={line.y + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {valueFormatter(Math.round(line.value * 10) / 10)}
            </text>
          </g>
        ))}

        {areaPath ? <path d={areaPath} fill="#c7d2fe" fillOpacity="0.55" stroke="none" /> : null}
        <path d={linePath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((point, index) => (
          <g key={`point-${index}`}>
            <circle cx={xOf(index).toFixed(1)} cy={yOf(values[index]).toFixed(1)} r="3.5" fill="#4338ca">
              <title>{`${point.label}: ${valueFormatter(point.value)}`}</title>
            </circle>
          </g>
        ))}

        {labelIndexes.map((index) => (
          <text
            key={`label-${index}`}
            x={xOf(index).toFixed(1)}
            y={height - 8}
            textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            fontSize="11"
            fill="#64748b"
          >
            {data[index].label}
          </text>
        ))}
      </svg>
      <figcaption className="sr-only">{ariaLabel}</figcaption>
    </figure>
  );
}
