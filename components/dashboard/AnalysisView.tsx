'use client'

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface AnalysisData {
  label: string;
  value: number;
}

export default function AnalysisView({ data }: { data?: AnalysisData[] }) {
  const chartRef = useRef<SVGSVGElement>(null);

  const defaultData: AnalysisData[] = [
    { label: 'World', value: 450 },
    { label: 'Tech', value: 890 },
    { label: 'Business', value: 320 },
    { label: 'Sports', value: 610 },
    { label: 'Health', value: 240 },
  ];

  const plotData = data || defaultData;

  useEffect(() => {
    if (!chartRef.current) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(plotData.map(d => d.label))
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(plotData, d => d.value) as number * 1.1])
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("class", "text-[10px] font-medium text-gray-500");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .attr("class", "text-[10px] font-medium text-gray-500");

    svg.selectAll("bar")
      .data(plotData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.label) as number)
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", "#0a0a0a")
      .attr("rx", 4)
      .attr("ry", 4)
      .on("mouseover", function() {
        d3.select(this).transition().duration(200).attr("fill", "#4b5563");
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(200).attr("fill", "#0a0a0a");
      });

  }, [plotData]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Article Performance Analysis</h3>
        <p className="text-sm text-gray-500">Visualization of article views by category.</p>
      </div>

      <div className="w-full max-w-2xl mx-auto">
        <svg ref={chartRef} width="100%" height="400" className="overflow-visible"></svg>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {plotData.map((d) => (
          <div key={d.label} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{d.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{d.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
