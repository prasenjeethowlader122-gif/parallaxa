

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  BarChart, LineChart, PieChart, Activity, TrendingUp, Users, Eye,
  ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';

interface AnalysisData {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface TimeData {
  date: Date;
  value: number;
}

export default function AnalysisView({ data }: { data?: AnalysisData[] }) {
  const barChartRef = useRef<SVGSVGElement>(null);
  const lineChartRef = useRef<SVGSVGElement>(null);
  const pieChartRef = useRef<SVGSVGElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distribution'>('overview');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  const categoryData: AnalysisData[] = data || [
    { label: 'World', value: 450, secondaryValue: 120 },
    { label: 'Tech', value: 890, secondaryValue: 340 },
    { label: 'Business', value: 320, secondaryValue: 90 },
    { label: 'Sports', value: 610, secondaryValue: 210 },
    { label: 'Health', value: 240, secondaryValue: 60 },
  ];

  const trendData: TimeData[] = Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000),
    value: Math.floor(Math.random() * 500) + 200
  }));

  // Render Bar Chart
  useEffect(() => {
    if (!barChartRef.current || activeTab !== 'overview') return;
    const svg = d3.select(barChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().rangeRound([0, width]).padding(0.3).domain(categoryData.map(d => d.label));
    const y = d3.scaleLinear().rangeRound([height, 0]).domain([0, d3.max(categoryData, d => Math.max(d.value, d.secondaryValue || 0)) as number * 1.1]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .attr("color", "#e5e7eb")
      .selectAll("text")
      .attr("color", "#6b7280")
      .attr("font-size", "10px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#e5e7eb")
      .selectAll("text")
      .attr("color", "#6b7280")
      .attr("font-size", "10px");

    g.selectAll(".bar")
      .data(categoryData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.label) as number)
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", "#0a0a0a")
      .attr("rx", 4)
      .attr("ry", 4);

    // Secondary bars (ghost)
    g.selectAll(".bar-secondary")
      .data(categoryData)
      .enter().append("rect")
      .attr("x", d => (x(d.label) as number) + x.bandwidth() * 0.25)
      .attr("y", d => y(d.secondaryValue || 0))
      .attr("width", x.bandwidth() * 0.5)
      .attr("height", d => height - y(d.secondaryValue || 0))
      .attr("fill", "#ef4444")
      .attr("opacity", 0.7)
      .attr("rx", 2);

  }, [categoryData, activeTab]);

  // Render Line Chart
  useEffect(() => {
    if (!lineChartRef.current || activeTab !== 'trends') return;
    const svg = d3.select(lineChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().range([0, width]).domain(d3.extent(trendData, d => d.date) as [Date, Date]);
    const y = d3.scaleLinear().range([height, 0]).domain([0, d3.max(trendData, d => d.value) as number * 1.2]);

    const line = d3.line<TimeData>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const area = d3.area<TimeData>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(trendData)
      .attr("fill", "rgba(10, 10, 10, 0.05)")
      .attr("d", area);

    g.append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", "#0a0a0a")
      .attr("stroke-width", 2)
      .attr("d", line);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr("color", "#e5e7eb")
      .selectAll("text")
      .attr("color", "#6b7280");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#e5e7eb")
      .selectAll("text")
      .attr("color", "#6b7280");

    // Add points
    g.selectAll(".dot")
      .data(trendData)
      .enter().append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.value))
      .attr("r", 3)
      .attr("fill", "#ffffff")
      .attr("stroke", "#0a0a0a")
      .attr("stroke-width", 1.5);

  }, [trendData, activeTab]);

  // Render Pie Chart
  useEffect(() => {
    if (!pieChartRef.current || activeTab !== 'distribution') return;
    const svg = d3.select(pieChartRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;

    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal<string>()
      .domain(categoryData.map(d => d.label))
      .range(['#0a0a0a', '#374151', '#6b7280', '#9ca3af', '#d1d5db']);

    const pie = d3.pie<AnalysisData>().value(d => d.value);
    const arc = d3.arc<d3.PieArcDatum<AnalysisData>>().innerRadius(radius * 0.6).outerRadius(radius);
    const outerArc = d3.arc<d3.PieArcDatum<AnalysisData>>().innerRadius(radius * 1.1).outerRadius(radius * 1.1);

    const arcs = g.selectAll(".arc")
      .data(pie(categoryData))
      .enter().append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.label));

    // Labels
    arcs.append("text")
      .attr("transform", d => `translate(${outerArc.centroid(d)})`)
      .attr("dy", ".35em")
      .style("text-anchor", d => {
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return (midangle < Math.PI ? 'start' : 'end');
      })
      .text(d => d.data.label)
      .attr("fill", "#6b7280")
      .attr("font-size", "10px")
      .attr("font-weight", "500");

  }, [categoryData, activeTab]);

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Views', value: '1.2M', trend: '+12.5%', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg. Read Time', value: '4m 32s', trend: '+0.8%', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Engagement Rate', value: '24.8%', trend: '-2.4%', icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Active Readers', value: '18.4K', trend: '+15.2%', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend}
                {stat.trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="text-red-600" size={24} />
              Platform Intelligence
            </h3>
            <p className="text-sm text-gray-500 mt-1">Advanced analytics and data visualization.</p>
          </div>

          <div className="flex bg-gray-50 p-1 rounded-xl shrink-0">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart },
              { id: 'trends', label: 'Trends', icon: LineChart },
              { id: 'distribution', label: 'Share', icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="w-full aspect-[2/1] min-h-[300px] flex items-center justify-center">
            {activeTab === 'overview' && (
              <svg ref={barChartRef} width="100%" height="300" viewBox="0 0 600 300" className="overflow-visible"></svg>
            )}
            {activeTab === 'trends' && (
              <svg ref={lineChartRef} width="100%" height="300" viewBox="0 0 600 300" className="overflow-visible"></svg>
            )}
            {activeTab === 'distribution' && (
              <svg ref={pieChartRef} width="100%" height="300" viewBox="0 0 600 300" className="overflow-visible"></svg>
            )}
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-4">
            {categoryData.map((d, i) => (
              <div key={d.label} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-gray-900 group-hover:scale-125 transition-transform" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{d.label}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{d.value.toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-green-600 bg-green-50 w-fit px-1.5 py-0.5 rounded-full">
                  <TrendingUp size={10} />
                  +{(Math.random() * 20).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50/50 px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" />
            Last updated: {lastUpdated}
          </p>
          <button className="text-xs font-bold text-gray-900 flex items-center gap-1 hover:gap-2 transition-all">
            Full Report <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
