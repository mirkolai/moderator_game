import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

import { CATEGORY_CONFIG } from '../config/categories';
import type { TimeSeriesPoint } from '../types';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
}

const seriesConfig = [
  { key: 'gamma', label: CATEGORY_CONFIG.gamma.label, color: CATEGORY_CONFIG.gamma.color },
  { key: 'beta', label: CATEGORY_CONFIG.beta.label, color: CATEGORY_CONFIG.beta.color },
  { key: 'alpha', label: CATEGORY_CONFIG.alpha.label, color: CATEGORY_CONFIG.alpha.color },
] as const;

export function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const width = 1160;
    const height = 280;
    const margin = { top: 16, right: 28, bottom: 40, left: 52 };

    const svg = d3.select(svgRef.current);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxStep = d3.max(data, (point) => point.step) ?? 1;
    const x = d3.scaleLinear().domain([0, Math.max(1, maxStep)]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    plot
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(Math.min(maxStep + 1, 10)).tickFormat((value) => `${value}`))
      .call((group) => group.selectAll('text').attr('fill', '#50667f'))
      .call((group) => group.selectAll('line,path').attr('stroke', '#9db1c8'));

    plot
      .append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat((value) => `${Math.round(Number(value) * 100)}%`))
      .call((group) => group.selectAll('text').attr('fill', '#50667f'))
      .call((group) => group.selectAll('line,path').attr('stroke', '#9db1c8'));

    plot
      .append('g')
      .attr('class', 'chart-grid')
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(() => ''))
      .call((group) => group.selectAll('line').attr('stroke', 'rgba(96, 126, 163, 0.18)'))
      .call((group) => group.select('path').remove());

    const line = <K extends keyof TimeSeriesPoint>(key: K) =>
      d3
        .line<TimeSeriesPoint>()
        .x((point) => x(point.step))
        .y((point) => y(point[key] as number))
        .curve(d3.curveCatmullRom.alpha(0.5));

    seriesConfig.forEach((series) => {
      const path = plot
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', 3)
        .attr('d', line(series.key));

      const totalLength = path.node()?.getTotalLength() ?? 0;
      path.attr('stroke-dasharray', `${totalLength} ${totalLength}`).attr('stroke-dashoffset', totalLength).transition().duration(700).attr('stroke-dashoffset', 0);
    });

    const legend = svg.append('g').attr('transform', `translate(${width - 500}, 20)`);
    seriesConfig.forEach((series, index) => {
      const row = legend.append('g').attr('transform', `translate(${index * 160}, 0)`);
      row.append('circle').attr('r', 5).attr('cx', 0).attr('cy', 0).attr('fill', series.color);
      row.append('text').attr('x', 10).attr('y', 4).attr('fill', '#30475f').text(series.label);
    });
  }, [data]);

  return (
    <section className="card chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Trend</p>
          <h2>Election Sentiment Over Time</h2>
        </div>
      </div>
      <svg ref={svgRef} className="chart-svg" role="img" aria-label="Simulation time series chart" />
    </section>
  );
}
