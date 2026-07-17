import * as d3 from 'd3';

type WeeklyPoint = { label: string; value: number };
type BusinessDistributionPoint = { category: string; value: number; color: string };

export function drawRevenueChart(el: HTMLElement) {
  d3.select(el).selectAll('*').remove();

  const width = el.offsetWidth || 800;
  const height = 380;
  const margin = { top: 16, right: 24, bottom: 50, left: 52 };

  const data = [
    { month: 'Jan', revenue: 5000 },
    { month: 'Feb', revenue: 7000 },
    { month: 'Mar', revenue: 6000 },
    { month: 'Apr', revenue: 8000 },
    { month: 'May', revenue: 7500 },
    { month: 'Jun', revenue: 9000 }
  ];

  const x = d3.scalePoint<string>()
    .domain(data.map(d => d.month))
    .range([margin.left, width - margin.right])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, 11000])
    .range([height - margin.bottom, margin.top]);

  const svg = d3.select(el)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('style', 'max-width:100%;height:auto;');

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px'));

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickValues([0, 2000, 4000, 6000, 8000, 10000]).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px'));

  const line = d3.line<{ month: string; revenue: number }>()
    .x(d => x(d.month)!)
    .y(d => y(d.revenue))
    .curve(d3.curveMonotoneX);

  const area = d3.area<{ month: string; revenue: number }>()
    .x(d => x(d.month)!)
    .y0(d => y(0))
    .y1(d => y(d.revenue))
    .curve(d3.curveMonotoneX);

  svg.append('path')
    .datum(data)
    .attr('fill', '#083594')
    .attr('fill-opacity', 0.1)
    .attr('d', area);

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#083594')
    .attr('stroke-width', 3)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('d', line);

  svg.append('g')
    .selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => x(d.month)!)
    .attr('cy', d => y(d.revenue))
    .attr('r', 5)
    .attr('fill', '#083594')
    .attr('stroke', 'white')
    .attr('stroke-width', 2);
}

export function drawWeeklyActivityChart(el: HTMLElement, data: WeeklyPoint[]) {
  d3.select(el).selectAll('*').remove();

  const width = el.offsetWidth || 800;
  const height = 360;
  const margin = { top: 20, right: 20, bottom: 65, left: 45 };

  const chartData = data.length > 0 ? data : [];

  const x = d3.scaleBand<string>()
    .domain(chartData.map(d => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.16);

  const y = d3.scaleLinear()
    .domain([0, Math.max(5, d3.max(chartData, d => d.value) || 0)])
    .range([height - margin.bottom, margin.top]);

  const svg = d3.select(el)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('style', 'max-width:100%;height:auto;');

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '11px').attr('transform', 'translate(0,5)'));

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px'));

  svg.append('g')
    .selectAll('line')
    .data(y.ticks(5))
    .join('line')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', d => y(d))
    .attr('y2', d => y(d))
    .attr('stroke', '#e5e7eb')
    .attr('stroke-dasharray', '4,4');

  svg.append('g')
    .attr('fill', '#083594')
    .selectAll('rect')
    .data(chartData)
    .join('rect')
    .attr('x', d => x(d.label)!)
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => y(0) - y(d.value));

  svg.append('g')
    .selectAll('text')
    .data(chartData)
    .join('text')
    .attr('x', d => (x(d.label)! + x.bandwidth() / 2))
    .attr('y', d => y(d.value) - 8)
    .attr('text-anchor', 'middle')
    .attr('fill', '#475569')
    .style('font-size', '11px')
    .style('font-weight', '600')
    .text(d => d.value);
}

export function drawBusinessDistributionChart(el: HTMLElement, distribution: BusinessDistributionPoint[]) {
  d3.select(el).selectAll('*').remove();

  const width = el.offsetWidth || 800;
  const height = 290;
  const radius = Math.min(width, height) / 2 - 18;
  const color = d3.scaleOrdinal<string>()
    .domain(distribution.map(d => d.category))
    .range(distribution.map(d => d.color));

  const pie = d3.pie<{ category: string; value: number }>()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc<d3.PieArcDatum<{ category: string; value: number }>>()
    .innerRadius(radius * 0.75)
    .outerRadius(radius);

  const labelArc = d3.arc<d3.PieArcDatum<{ category: string; value: number }>>()
    .innerRadius(radius * 0.74)
    .outerRadius(radius * 0.74);

  const svg = d3.select(el)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('style', 'max-width:100%;height:auto;')
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const arcs = svg.selectAll('.arc')
    .data(pie(distribution))
    .join('g')
    .attr('class', 'arc');

  arcs.append('path')
    .attr('d', arc as any)
    .attr('fill', d => color(d.data.category) as string)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  const total = distribution.reduce((sum, item) => sum + item.value, 0);

  arcs.append('text')
    .attr('transform', d => `translate(${labelArc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '600')
    .style('fill', '#64748b')
    .text(d => (d.data.value / total) >= 0.1 ? `${d.data.value}` : '');
}
