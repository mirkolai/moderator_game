import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

import { CATEGORY_CONFIG } from '../config/categories';
import type { EdgeDatum, GraphState, NodeDatum } from '../types';

interface NetworkGraphProps {
  graph: GraphState | null;
  selectedNodeId: number | null;
  highlightedNodeIds: number[];
  onSelectNode: (nodeId: number) => void;
}

type SimNode = d3.SimulationNodeDatum & NodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode> & EdgeDatum;

type EdgeChange = 'normal' | 'new' | 'removed';

interface RenderLinkDatum {
  key: string;
  sourceId: number;
  targetId: number;
  change: EdgeChange;
}

const animalImageModules = import.meta.glob('../img/animal_50x50/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const animalImages = Object.entries(animalImageModules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([, imageSrc]) => imageSrc);

function edgeKey(source: number, target: number): string {
  return `${source}-${target}`;
}

function formatNodeAlignment(node: NodeDatum): string {
  const alignment = node.state.toFixed(2);
  return `Node ${node.id} | Alignment: ${alignment} | Category: ${node.classification}`;
}

function getNodeImage(nodeId: number): string | null {
  if (animalImages.length === 0) {
    return null;
  }
  const imageIndex = ((nodeId - 1) % animalImages.length + animalImages.length) % animalImages.length;
  return animalImages[imageIndex];
}

export function NetworkGraph({ graph, selectedNodeId, highlightedNodeIds, onSelectNode }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const highlightedSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);

  const nodeColor = (node: SimNode) => {
    if (node.classification === 'gamma') return CATEGORY_CONFIG.gamma.color;
    if (node.classification === 'alpha') return CATEGORY_CONFIG.alpha.color;
    return CATEGORY_CONFIG.beta.color;
  };

  // Compute neighbors of selected node for visibility control
  const selectedNodeNeighbors = useMemo(() => {
    if (selectedNodeId === null || !graph) return new Set<number>();
    const neighbors = new Set<number>();
    neighbors.add(selectedNodeId); // Include the node itself
    for (const edge of graph.edges) {
      if (edge.source === selectedNodeId) neighbors.add(edge.target);
      if (edge.target === selectedNodeId) neighbors.add(edge.source);
    }
    return neighbors;
  }, [selectedNodeId, graph]);

  // Refs that survive re-renders without triggering effects
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const nodeSelRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, null> | null>(null);
  const prevStepRef = useRef<number | null>(null);
  const prevEdgesRef = useRef<Map<string, EdgeDatum>>(new Map());
  const removedForStepRef = useRef<Map<string, EdgeDatum>>(new Map());

  // Keep the callback always fresh without adding it to effect deps
  const onSelectRef = useRef(onSelectNode);
  onSelectRef.current = onSelectNode;

  // Zoom behavior and last known transform – persisted across steps
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // ── Effect 1: graph topology ────────────────────────────────────────────────
  // Runs only when the graph data changes (step advance / edge add-remove / reset).
  // selectedNodeId and highlightedSet are intentionally excluded from the deps.
  useEffect(() => {
    if (!graph || !svgRef.current) {
      return;
    }

    const width = 920;
    const height = 520;
    const svg = d3.select(svgRef.current);
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Preserve existing positions so nodes don't jump on each step
    const prevById = new Map(nodesRef.current.map((n) => [n.id, n]));
    const nodes: SimNode[] = graph.nodes.map((node) => {
      const prev = prevById.get(node.id);
      return {
        ...node,
        x: prev?.x ?? width / 2 + (Math.random() - 0.5) * 100,
        y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 100,
      };
    });
    nodesRef.current = nodes;

    const links: SimLink[] = graph.edges.map((edge) => ({ ...edge }));

    let newEdgeKeys = new Set<string>();
    let removedThisStep = removedForStepRef.current;
    const currentEdgesByKey = new Map(graph.edges.map((edge) => [edgeKey(edge.source, edge.target), edge]));

    // Compute edge diff only when the simulation moves forward.
    // On reset (step goes back to 0 or decreases), clear transient edge styles.
    if (prevStepRef.current !== null && graph.step !== prevStepRef.current) {
      const isReset = graph.step === 0 || graph.step < prevStepRef.current;
      if (isReset) {
        newEdgeKeys = new Set();
        removedThisStep = new Map();
        removedForStepRef.current = removedThisStep;
      } else {
        newEdgeKeys = new Set(
          [...currentEdgesByKey.keys()].filter((key) => !prevEdgesRef.current.has(key)),
        );
        removedThisStep = new Map(
          [...prevEdgesRef.current.entries()].filter(([key]) => !currentEdgesByKey.has(key)),
        );
        removedForStepRef.current = removedThisStep;
      }
    }

    const renderLinks: RenderLinkDatum[] = [
      ...graph.edges.map((edge) => {
        const key = edgeKey(edge.source, edge.target);
        const change: EdgeChange = newEdgeKeys.has(key) ? 'new' : 'normal';
        return {
          key,
          sourceId: edge.source,
          targetId: edge.target,
          change,
        };
      }),
      ...[...removedThisStep.entries()].map(([key, edge]) => ({
        key,
        sourceId: edge.source,
        targetId: edge.target,
        change: 'removed' as const,
      })),
    ];

    // ── Degree-based radius ──────────────────────────────────────────────────
    const degreeMap = new Map<number, number>();
    for (const edge of graph.edges) {
      degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
    }
    const maxDegree = Math.max(1, ...degreeMap.values());
    // sqrt scale → area proportional to degree, not radius
    const radiusScale = d3.scaleSqrt().domain([0, maxDegree]).range([9, 26]);
    const nodeRadius = (id: number) => radiusScale(degreeMap.get(id) ?? 0);

    const defs = svg.selectAll('defs').data([null]).join('defs');
    defs
      .selectAll('#arrowhead')
      .data(graph.directed ? [null] : [])
      .join(
        (enter) =>
          enter
            .append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            // refX ≈ max node radius + arrow tip length so arrow stops at node edge
            .attr('refX', 32)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', '#8b949e')
            .attr('d', 'M0,-5L10,0L0,5'),
        (update) => update,
        (exit) => exit.remove(),
      );

    const root = svg.selectAll<SVGGElement, null>('g.scene').data([null]).join('g').attr('class', 'scene');
    const linkLayer = root.selectAll<SVGGElement, null>('g.links').data([null]).join('g').attr('class', 'links');
    const nodeLayer = root.selectAll<SVGGElement, null>('g.nodes').data([null]).join('g').attr('class', 'nodes');
    const tooltip = d3
      .select('body')
      .selectAll<HTMLDivElement, null>('div.graph-node-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'graph-node-tooltip')
      .style('display', 'none');

    const positionTooltip = (event: MouseEvent) => {
      const offset = 14;
      const tooltipNode = tooltip.node();
      if (!tooltipNode) return;

      const tooltipRect = tooltipNode.getBoundingClientRect();
      const maxLeft = Math.max(8, window.innerWidth - tooltipRect.width - 8);
      const maxTop = Math.max(8, window.innerHeight - tooltipRect.height - 8);
      const left = Math.min(maxLeft, event.clientX + offset);
      const top = Math.min(maxTop, event.clientY + offset);

      tooltip.style('left', `${left}px`).style('top', `${top}px`);
    };

    const showTooltip = (event: MouseEvent, node: SimNode) => {
      const imageSrc = getNodeImage(node.id);
      const tooltipText = formatNodeAlignment(node);
      const imageMarkup = imageSrc
        ? `<img class="graph-node-tooltip__image" src="${imageSrc}" alt="Animal avatar for node ${node.id}" />`
        : '';

      tooltip
        .html(`<div class="graph-node-tooltip__text">${tooltipText}</div>${imageMarkup}`)
        .style('display', 'flex')
        .style('opacity', 1);

      positionTooltip(event);
    };

    const hideTooltip = () => {
      tooltip.style('display', 'none').style('opacity', 0);
    };

    // Click on empty SVG area to deselect
    svg.on('click', (event: MouseEvent) => {
      // Only deselect if clicking on the SVG background, not on nodes/elements
      if (event.target === svgRef.current) {
        onSelectRef.current(null as any);
      }
    });

    // Links – slow fade-in for new edges, fade-out for removed ones
    const linkSelection = linkLayer
      .selectAll<SVGLineElement, RenderLinkDatum>('line')
      .data(renderLinks, (link) => link.key)
      .join(
        (enter) =>
          enter
            .append('line')
            .attr('class', 'graph-link')
            .attr('stroke', (link) => (link.change === 'removed' ? '#ff9a8f' : link.change === 'new' ? '#ffd166' : '#93a1b1'))
            .attr('stroke-opacity', 0)
            .attr('stroke-width', (link) => (link.change === 'new' ? 3.2 : link.change === 'removed' ? 2.6 : 1.4))
            .attr('stroke-dasharray', (link) => (link.change === 'removed' ? '8 6' : null))
            .attr('marker-end', (link) =>
              graph.directed && link.change !== 'removed' ? 'url(#arrowhead)' : null,
            )
            .call((selection) =>
              selection
                .transition()
                .duration(700)
                .attr('stroke-opacity', (link) => (link.change === 'new' ? 0.9 : link.change === 'removed' ? 0.78 : 0.56)),
            ),
        (update) =>
          update.call((selection) =>
            selection
              .transition()
              .duration(500)
              .attr('stroke', (link) =>
                link.change === 'removed' ? '#ff9a8f' : link.change === 'new' ? '#ffd166' : '#93a1b1',
              )
              .attr('stroke-width', (link) => (link.change === 'new' ? 3.2 : link.change === 'removed' ? 2.6 : 1.4))
              .attr('stroke-dasharray', (link) => (link.change === 'removed' ? '8 6' : null))
              .attr('stroke-opacity', (link) => (link.change === 'new' ? 0.9 : link.change === 'removed' ? 0.78 : 0.56))
              .attr('marker-end', (link) =>
                graph.directed && link.change !== 'removed' ? 'url(#arrowhead)' : null,
              ),
          ),
        (exit) => exit.call((selection) => selection.transition().duration(400).attr('stroke-opacity', 0).remove()),
      );

    const nodeSelection = nodeLayer
      .selectAll<SVGGElement, SimNode>('g.node')
      .data(nodes, (node) => node.id)
      .join(
        (enter) => {
          const group = enter.append('g').attr('class', 'node').style('cursor', 'pointer').attr('opacity', 0);
          group.append('circle').attr('r', (node) => nodeRadius(node.id)).attr('stroke-width', 2.5);
          group
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .attr('class', 'node-label')
            .text((node) => node.id);
          group.call((selection) => selection.transition().duration(500).attr('opacity', 1));
          return group;
        },
        (update) => update,
        (exit) => exit.call((selection) => selection.transition().duration(200).attr('opacity', 0).remove()),
      )
      .on('click', (_, node) => {
        // Toggle selection: if already selected, deselect
        if (selectedNodeId === node.id) {
          onSelectRef.current(null as any);
        } else {
          onSelectRef.current(node.id);
        }
      })
      .on('mouseenter', (event, node) => showTooltip(event, node))
      .on('mousemove', (event, node) => showTooltip(event, node))
      .on('mouseleave', hideTooltip);

    // Update fill (state color) and radius; stroke is owned by Effect 2
    nodeSelection
      .select('circle')
      .transition()
      .duration(600)
      .attr('r', (node) => nodeRadius(node.id))
      .attr('fill', (node) => nodeColor(node));

    nodeSelRef.current = nodeSelection;

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, node) => {
        if (!event.active) {
          simRef.current?.alphaTarget(0.12).restart();
        }
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on('end', (event, node) => {
        if (!event.active) {
          simRef.current?.alphaTarget(0);
        }
        node.fx = null;
        node.fy = null;
      });

    nodeSelection.call(drag);

    // Stop the previous simulation before building a new one
    simRef.current?.stop();

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id((node) => node.id).distance(90).strength(0.22))
      .force('charge', d3.forceManyBody().strength(-170))
      // Weak center strength: avoids yanking nodes to the middle
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force('collision', d3.forceCollide((node) => nodeRadius((node as SimNode).id) + 4))
      // Low alpha + slower decay → gentle drift, not a full re-layout
      .alpha(0.18)
      .alphaDecay(0.035);

    simRef.current = simulation;

    // ── Zoom & pan ───────────────────────────────────────────────────────────
    // Created once; subsequent graph updates re-attach without resetting transform.
    if (!zoomRef.current) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 6])
        .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          zoomTransformRef.current = event.transform;
          // Always target the current g.scene, whatever step we are on
          svg.select<SVGGElement>('g.scene').attr('transform', event.transform.toString());
        });
      zoomRef.current = zoom;
      svg.call(zoom);
      // Double-click on empty SVG background resets zoom
      svg.on('dblclick.zoom', () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      });
    } else {
      // Re-attach (idempotent) and restore the saved camera position
      svg.call(zoomRef.current);
      svg.call(zoomRef.current.transform, zoomTransformRef.current);
    }
    // On a full reset (step 0) snap back to identity
    if (graph.step === 0) {
      zoomTransformRef.current = d3.zoomIdentity;
      svg.call(zoomRef.current.transform, d3.zoomIdentity);
    }

    simulation.on('tick', () => {
      const nodeById = new Map(nodes.map((node) => [node.id, node]));

      linkSelection
        .attr('x1', (link) => nodeById.get(link.sourceId)?.x ?? 0)
        .attr('y1', (link) => nodeById.get(link.sourceId)?.y ?? 0)
        .attr('x2', (link) => nodeById.get(link.targetId)?.x ?? 0)
        .attr('y2', (link) => nodeById.get(link.targetId)?.y ?? 0);

      // nodeSelRef always points at the latest selection, so the tick stays valid
      nodeSelRef.current?.attr('transform', (node) => `translate(${node.x ?? 0}, ${node.y ?? 0})`);
    });

    prevStepRef.current = graph.step;
    prevEdgesRef.current = currentEdgesByKey;

    return () => {
      hideTooltip();
      simulation.stop();
    };
  }, [graph]); // ← graph only; selection state never triggers a layout reset

  // ── Effect 2: selection + highlight ────────────────────────────────────────
  // Only updates stroke/glow style and opacity. The simulation is never touched here.
  useEffect(() => {
    nodeSelRef.current?.attr('opacity', (node) => {
      // If a node is selected and this node is not a neighbor, dim it
      if (selectedNodeId !== null && !selectedNodeNeighbors.has(node.id)) {
        return 0.25;
      }
      return 1;
    });

    // Update fill color immediately (no transition) to ensure colors are always correct
    nodeSelRef.current
      ?.select('circle')
      .attr('fill', (node) => nodeColor(node));

    // Update stroke and other visual properties with transition
    nodeSelRef.current
      ?.select('circle')
      .transition()
      .duration(200)
      .attr('stroke', (node) => {
        if (selectedNodeId === node.id) return '#f3f6f8';
        if (highlightedSet.has(node.id)) return '#ffce73';
        return '#17212b';
      })
      .attr('stroke-width', (node) =>
        selectedNodeId === node.id || highlightedSet.has(node.id) ? 4 : 2.5,
      )
      .attr('filter', (node) =>
        highlightedSet.has(node.id) ? 'drop-shadow(0 0 12px rgba(255, 206, 115, 0.65))' : null,
      );
  }, [selectedNodeId, highlightedSet, selectedNodeNeighbors]);

  return (
    <section className="card graph-panel">
      <svg ref={svgRef} className="graph-svg" role="img" aria-label="Simulation network graph" />
    </section>
  );
}
