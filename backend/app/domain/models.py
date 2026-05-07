from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class PostType(str, Enum):
    dictatorship = "dictatorship"
    democracy = "democracy"
    NEUTRAL = "neutral"


class PostStatus(str, Enum):
    ACTIVE = "active"
    CENSORED = "censored"


class Outcome(str, Enum):
    RUNNING = "running"
    WON = "won"
    LOST = "lost"


@dataclass(slots=True)
class PostRecord:
    id: str
    type: PostType
    creator_node: int
    creation_step: int
    seen_by: set[int] = field(default_factory=set)
    reposted_by: set[int] = field(default_factory=set)
    status: PostStatus = PostStatus.ACTIVE
    active_emitters: set[int] = field(default_factory=set)
    next_emitters: set[int] = field(default_factory=set)


@dataclass(slots=True)
class TimeSeriesPoint:
    step: int
    dictatorship: float
    democracy: float
    neutral: float


@dataclass(slots=True)
class SimulationSnapshot:
    step: int
    node_states: list[float]
    outcome: Outcome
    message: str
    censorship_actions_remaining: int
