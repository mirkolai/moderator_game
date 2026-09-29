import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

import { getAnimalImageForNode } from '../config/animals';
import { CATEGORY_CONFIG } from '../config/categories';
import type { EdgeDatum, GraphState, NodeDatum } from '../types';

// Fraction of the node radius occupied by the animal image.
// This leaves a visible category-colored ring around the avatar.
const AVATAR_INSET = 0.82;

interface NetworkGraphProps {
  graph: GraphState | null;
  selectedNodeId: number | null;
  highlightedNodeIds: number[];
  onSelectNode: (nodeId: number | null) => void;
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

function edgeKey(source: number, target: number): string {
  return `${source}-${target}`;
}

function formatNodeAlignment(node: NodeDatum): string {
  const alignment = node.state.toFixed(2);
  return `Node ${node.id} | Alignment: ${alignment} | Category: ${node.classification}`;
}

export function NetworkGraph({
  graph,
  selectedNodeId,
  highlightedNodeIds,
  onSelectNode,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const highlightedSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds],
  );

  const nodeColor = (node: SimNode): string => {
    if (node.classification === 'gamma') {
      return CATEGORY_CONFIG.gamma.color;
    }

    if (node.classification === 'alpha') {
      return CATEGORY_CONFIG.alpha.color;
    }

    return CATEGORY_CONFIG.beta.color;
  };

  // ---------------------------------------------------------------------------
  // Selected node neighbors
  // ---------------------------------------------------------------------------

  const selectedNodeNeighbors = useMemo(() => {
    if (selectedNodeId === null || !graph) {
      return new Set<number>();
    }

    const neighbors = new Set<number>();

    // Include the selected node itself.
    neighbors.add(selectedNodeId);

    for (const edge of graph.edges) {
      if (edge.source === selectedNodeId) {
        neighbors.add(edge.target);
      }

      if (edge.target === selectedNodeId) {
        neighbors.add(edge.source);
      }
    }

    return neighbors;
  }, [selectedNodeId, graph]);

  // ---------------------------------------------------------------------------
  // Persistent refs
  // ---------------------------------------------------------------------------

  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const nodesRef = useRef<SimNode[]>([]);

  const nodeSelRef = useRef<
    d3.Selection<SVGGElement, SimNode, SVGGElement, null> | null
  >(null);

  const prevStepRef = useRef<number | null>(null);

  const prevEdgesRef = useRef<Map<string, EdgeDatum>>(new Map());

  const removedForStepRef = useRef<Map<string, EdgeDatum>>(new Map());

  // Keep callback fresh without forcing the graph effect to rerun.
  const onSelectRef = useRef(onSelectNode);
  onSelectRef.current = onSelectNode;

  // Zoom state survives graph updates.
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const zoomTransformRef = useRef<d3.ZoomTransform>(
    d3.zoomIdentity,
  );

  // ===========================================================================
  // EFFECT 1 — GRAPH / TOPOLOGY / SIMULATION
  // ===========================================================================

  useEffect(() => {
    if (!graph || !svgRef.current) {
      return;
    }

    const width = 920;
    const height = 520;

    const svg = d3.select(svgRef.current);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // -------------------------------------------------------------------------
    // Preserve node positions between simulation steps
    // -------------------------------------------------------------------------

    const prevById = new Map(
      nodesRef.current.map((node) => [node.id, node]),
    );

    const nodes: SimNode[] = graph.nodes.map((node) => {
      const previous = prevById.get(node.id);

      return {
        ...node,

        x:
          previous?.x ??
          width / 2 + (Math.random() - 0.5) * 100,

        y:
          previous?.y ??
          height / 2 + (Math.random() - 0.5) * 100,
      };
    });

    nodesRef.current = nodes;

    const links: SimLink[] = graph.edges.map((edge) => ({
      ...edge,
    }));

    // -------------------------------------------------------------------------
    // Detect edge changes
    // -------------------------------------------------------------------------

    let newEdgeKeys = new Set<string>();

    let removedThisStep = removedForStepRef.current;

    const currentEdgesByKey = new Map<string, EdgeDatum>(
      graph.edges.map((edge) => [
        edgeKey(edge.source, edge.target),
        edge,
      ]),
    );

    if (
      prevStepRef.current !== null &&
      graph.step !== prevStepRef.current
    ) {
      const isReset =
        graph.step === 0 ||
        graph.step < prevStepRef.current;

      if (isReset) {
        newEdgeKeys = new Set();

        removedThisStep = new Map();

        removedForStepRef.current = removedThisStep;
      } else {
        newEdgeKeys = new Set(
          [...currentEdgesByKey.keys()].filter(
            (key) => !prevEdgesRef.current.has(key),
          ),
        );

        removedThisStep = new Map(
          [...prevEdgesRef.current.entries()].filter(
            ([key]) => !currentEdgesByKey.has(key),
          ),
        );

        removedForStepRef.current = removedThisStep;
      }
    }

    const renderLinks: RenderLinkDatum[] = [
      ...graph.edges.map((edge) => {
        const key = edgeKey(edge.source, edge.target);

        const change: EdgeChange = newEdgeKeys.has(key)
          ? 'new'
          : 'normal';

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

    // =========================================================================
    // DEGREE
    // =========================================================================

    const degreeMap = new Map<number, number>();

    for (const node of graph.nodes) {
      degreeMap.set(node.id, 0);
    }

    for (const edge of graph.edges) {
      degreeMap.set(
        edge.source,
        (degreeMap.get(edge.source) ?? 0) + 1,
      );

      degreeMap.set(
        edge.target,
        (degreeMap.get(edge.target) ?? 0) + 1,
      );
    }

    const maxDegree = Math.max(
      1,
      ...degreeMap.values(),
    );

    const radiusScale = d3
      .scaleSqrt<number, number>()
      .domain([0, maxDegree])
      .range([8, 30])
      .clamp(true);

    const nodeRadius = (nodeId: number): number => {
      return radiusScale(
        degreeMap.get(nodeId) ?? 0,
      );
    };

    // =========================================================================
    // SVG DEFS & LAYERS
    // =========================================================================

    const defs = svg
      .selectAll<SVGDefsElement, null>('defs')
      .data([null])
      .join('defs');

    defs
      .selectAll<SVGMarkerElement, null>('#arrowhead')
      .data(graph.directed ? [null] : [])
      .join(
        (enter) =>
          enter
            .append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
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

    const root = svg
      .selectAll<SVGGElement, null>('g.scene')
      .data([null])
      .join('g')
      .attr('class', 'scene');

    const linkLayer = root
      .selectAll<SVGGElement, null>('g.links')
      .data([null])
      .join('g')
      .attr('class', 'links');

    const nodeLayer = root
      .selectAll<SVGGElement, null>('g.nodes')
      .data([null])
      .join('g')
      .attr('class', 'nodes');

    svg.on('click', (event: MouseEvent) => {
      if (event.target === svgRef.current) {
        onSelectRef.current(null);
      }
    });

    // =========================================================================
    // LINKS
    // =========================================================================

    const linkSelection = linkLayer
      .selectAll<SVGLineElement, RenderLinkDatum>('line')
      .data(
        renderLinks,
        (link) => link.key,
      )
      .join(
        (enter) =>
          enter
            .append('line')
            .attr('class', 'graph-link')
            .attr('stroke', (link) => {
              if (link.change === 'removed') return '#ff9a8f';
              if (link.change === 'new') return '#ffd166';
              return '#93a1b1';
            })
            .attr('stroke-opacity', 0)
            .attr('stroke-width', (link) => {
              if (link.change === 'new') return 3.2;
              if (link.change === 'removed') return 2.6;
              return 1.4;
            })
            .attr('stroke-dasharray', (link) =>
              link.change === 'removed' ? '8 6' : null,
            )
            .attr('marker-end', (link) =>
              graph.directed && link.change !== 'removed'
                ? 'url(#arrowhead)'
                : null,
            )
            .call((selection) =>
              selection
                .transition()
                .duration(700)
                .attr('stroke-opacity', (link) => {
                  if (link.change === 'new') return 0.9;
                  if (link.change === 'removed') return 0.78;
                  return 0.56;
                }),
            ),

        (update) =>
          update.call((selection) =>
            selection
              .interrupt()
              .transition()
              .duration(500)
              .attr('stroke', (link) => {
                if (link.change === 'removed') return '#ff9a8f';
                if (link.change === 'new') return '#ffd166';
                return '#93a1b1';
              })
              .attr('stroke-width', (link) => {
                if (link.change === 'new') return 3.2;
                if (link.change === 'removed') return 2.6;
                return 1.4;
              })
              .attr('stroke-dasharray', (link) =>
                link.change === 'removed' ? '8 6' : null,
              )
              .attr('stroke-opacity', (link) => {
                if (link.change === 'new') return 0.9;
                if (link.change === 'removed') return 0.78;
                return 0.56;
              })
              .attr('marker-end', (link) =>
                graph.directed && link.change !== 'removed'
                  ? 'url(#arrowhead)'
                  : null,
              ),
          ),

        (exit) =>
          exit.call((selection) =>
            selection
              .interrupt()
              .transition()
              .duration(400)
              .attr('stroke-opacity', 0)
              .remove(),
          ),
      );

    // =========================================================================
    // NODES
    // =========================================================================

    const nodeSelection = nodeLayer
      .selectAll<SVGGElement, SimNode>('g.node')
      .data(
        nodes,
        (node) => node.id,
      )
      .join(
        (enter) => {
          const group = enter
            .append('g')
            .attr('class', 'node')
            .style('cursor', 'pointer')
            .attr('opacity', 0);

          // 1. Cerchio di sfondo BIANCO per mascherare gli archi sotto il nodo
          group
            .append('circle')
            .attr('class', 'node-bg')
            .attr('fill', '#ffffff');

          // 2. Cerchio colorato della categoria
          group
            .append('circle')
            .attr('class', 'node-main')
            .attr('stroke-width', 2.5);

          // 3. Avatar clip path
          group
            .append('clipPath')
            .attr('id', (node) => `node-clip-${node.id}`)
            .append('circle')
            .attr(
              'r',
              (node) => nodeRadius(node.id) * AVATAR_INSET,
            );

          // 4. Immagine dell'animale
          group
            .append('image')
            .attr('class', 'node-avatar')
            .attr('href', (node) => getAnimalImageForNode(node.id))
            .attr('clip-path', (node) => `url(#node-clip-${node.id})`)
            .attr('x', (node) => -nodeRadius(node.id) * AVATAR_INSET)
            .attr('y', (node) => -nodeRadius(node.id) * AVATAR_INSET)
            .attr('width', (node) => nodeRadius(node.id) * AVATAR_INSET * 2)
            .attr('height', (node) => nodeRadius(node.id) * AVATAR_INSET * 2)
            .attr('preserveAspectRatio', 'xMidYMid slice')
            .style('pointer-events', 'none');

          // Tooltip
          group.append('title').text((node) => formatNodeAlignment(node));

          group
            .transition()
            .duration(500)
            .attr('opacity', 1);

          return group;
        },

        (update) => update,

        (exit) =>
          exit.call((selection) =>
            selection
              .interrupt()
              .transition()
              .duration(200)
              .attr('opacity', 0)
              .remove(),
          ),
      )
      .on('click', (_, node) => {
        if (selectedNodeId === node.id) {
          onSelectRef.current(null);
        } else {
          onSelectRef.current(node.id);
        }
      });

    // =========================================================================
    // NODE TOOLTIP & GEOMETRY
    // =========================================================================

    nodeSelection
      .select('title')
      .text((node) => formatNodeAlignment(node));

    // Sincronizzazione raggio cerchio bianco di sfondo
    nodeSelection
      .select<SVGCircleElement>('circle.node-bg')
      .interrupt()
      .attr('r', (node) => nodeRadius(node.id));

    // Sincronizzazione raggio cerchio categoria
    nodeSelection
      .select<SVGCircleElement>('circle.node-main')
      .interrupt()
      .attr('r', (node) => nodeRadius(node.id))
      .attr('fill', (node) => nodeColor(node));

    // Sincronizzazione clipPath
    nodeSelection
      .select<SVGCircleElement>('clipPath circle')
      .interrupt()
      .attr('r', (node) => nodeRadius(node.id) * AVATAR_INSET);

    // Sincronizzazione immagine avatar
    nodeSelection
      .select<SVGImageElement>('image.node-avatar')
      .interrupt()
      .attr('x', (node) => -nodeRadius(node.id) * AVATAR_INSET)
      .attr('y', (node) => -nodeRadius(node.id) * AVATAR_INSET)
      .attr('width', (node) => nodeRadius(node.id) * AVATAR_INSET * 2)
      .attr('height', (node) => nodeRadius(node.id) * AVATAR_INSET * 2);

    nodeSelRef.current = nodeSelection;

    // =========================================================================
    // DRAG / SIMULATION / ZOOM
    // =========================================================================

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

    simRef.current?.stop();

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((node) => node.id)
          .distance(90)
          .strength(0.22),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-170))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force(
        'collision',
        d3.forceCollide<SimNode>((node) => nodeRadius(node.id) + 4),
      )
      .alpha(0.18)
      .alphaDecay(0.035);

    simRef.current = simulation;

    if (!zoomRef.current) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 6])
        .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          zoomTransformRef.current = event.transform;
          svg.select<SVGGElement>('g.scene').attr('transform', event.transform.toString());
        });

      zoomRef.current = zoom;
      svg.call(zoom);

      svg.on('dblclick.zoom', () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      });
    } else {
      svg.call(zoomRef.current);
      svg.call(zoomRef.current.transform, zoomTransformRef.current);
    }

    if (graph.step === 0) {
      zoomTransformRef.current = d3.zoomIdentity;
      svg.call(zoomRef.current!.transform, d3.zoomIdentity);
    }

    simulation.on('tick', () => {
      const nodeById = new Map(nodes.map((node) => [node.id, node]));

      linkSelection
        .attr('x1', (link) => nodeById.get(link.sourceId)?.x ?? 0)
        .attr('y1', (link) => nodeById.get(link.sourceId)?.y ?? 0)
        .attr('x2', (link) => nodeById.get(link.targetId)?.x ?? 0)
        .attr('y2', (link) => nodeById.get(link.targetId)?.y ?? 0);

      nodeSelRef.current?.attr(
        'transform',
        (node) => `translate(${node.x ?? 0}, ${node.y ?? 0})`,
      );
    });

    prevStepRef.current = graph.step;
    prevEdgesRef.current = currentEdgesByKey;

    return () => {
      simulation.stop();
      linkSelection.interrupt();
      nodeSelection.interrupt();
      nodeSelection.select('circle.node-main').interrupt();
      nodeSelection.select('circle.node-bg').interrupt();
      nodeSelection.select('clipPath circle').interrupt();
      nodeSelection.select('image.node-avatar').interrupt();
    };
  }, [graph]);

  // ===========================================================================
  // EFFECT 2 — SELECTION / HIGHLIGHT
  // ===========================================================================

  useEffect(() => {
    const selection = nodeSelRef.current;

    if (!selection) {
      return;
    }

    // Mantieni il contenitore principale g.node sempre opaco a 1
    selection.attr('opacity', 1);

    // Calcolo dell'opacità per i soli elementi in primo piano
    const getForegroundOpacity = (node: SimNode) => {
      if (
        selectedNodeId !== null &&
        !selectedNodeNeighbors.has(node.id)
      ) {
        return 0.25;
      }
      return 1;
    };

    // Applica l'opacità al cerchio categoria e all'avatar, lasciando il fondo bianco solido
    selection
      .select('circle.node-main')
      .attr('opacity', (node) => getForegroundOpacity(node));

    selection
      .select('image.node-avatar')
      .attr('opacity', (node) => getForegroundOpacity(node));

    // -------------------------------------------------------------------------
    // Fill
    // -------------------------------------------------------------------------

    selection
      .select('circle.node-main')
      .attr('fill', (node) => nodeColor(node));

    // -------------------------------------------------------------------------
    // Stroke / highlight
    // -------------------------------------------------------------------------

    selection
      .select('circle.node-main')
      .interrupt()
      .transition()
      .duration(200)
      .attr('stroke', (node) => {
        if (selectedNodeId === node.id) {
          return '#f3f6f8';
        }
        if (highlightedSet.has(node.id)) {
          return '#ffce73';
        }
        return '#17212b';
      })
      .attr('stroke-width', (node) =>
        selectedNodeId === node.id || highlightedSet.has(node.id)
          ? 4
          : 2.5,
      )
      .attr('filter', (node) =>
        highlightedSet.has(node.id)
          ? 'drop-shadow(0 0 3px rgba(255, 206, 115, 0.85))'
          : null,
      );
  }, [selectedNodeId, highlightedSet, selectedNodeNeighbors]);

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <section className="card graph-panel">
      <svg
        ref={svgRef}
        className="graph-svg"
        role="img"
        aria-label="Simulation network graph"
      />
    </section>
  );
}