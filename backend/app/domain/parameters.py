from __future__ import annotations

from pydantic import BaseModel, Field


class SimulationParameters(BaseModel):
    number_of_nodes: int = Field(default=24, ge=8, le=200)

    p_generate_base: float = Field(default=0.45, ge=0.0, le=1.0)
    weight_state_influence_on_post_type: float = Field(default=1.35, ge=0.0, le=5.0)
    bias_dictatorship: float = Field(default=1.15, ge=0.0, le=5.0)
    bias_democracy: float = Field(default=1.0, ge=0.0, le=5.0)
    bias_neutral: float = Field(default=0.85, ge=0.0, le=5.0)

    p_repost_base: float = Field(default=1.8, ge=0.0, le=5.0)
    p_repost_dictatorship: float = Field(default=1.35, ge=0.0, le=5.0)
    p_repost_democracy: float = Field(default=0.95, ge=0.0, le=5.0)
    p_repost_neutral: float = Field(default=0.65, ge=0.0, le=5.0)

    influence_strength: float = Field(default=0.08, ge=0.0, le=1.0)

    p_add_edge: float = Field(default=0.30, ge=0.0, le=1.0)
    edge_addition_dictatorship_threshold: float = Field(default=0.35, ge=0.0, le=1.0)
    edge_addition_democracy_threshold: float = Field(default=0.65, ge=0.0, le=1.0)
    p_remove_edge: float = Field(default=0.30, ge=0.0, le=1.0)
    edge_removal_opinion_threshold: float = Field(default=0.30, ge=0.0, le=1.0)

    max_censorship_actions_per_step: int = Field(default=1, ge=0, le=25)

    election_step: int = Field(default=20, ge=15, le=30)
    win_threshold: float = Field(default=0.8, ge=0.5, le=1.0)
    neutrality_tolerance: float = Field(default=0.5, ge=0.0, le=0.5)
