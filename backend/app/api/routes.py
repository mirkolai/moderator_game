from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.domain.parameters import SimulationParameters
from app.domain.simulation_engine import SimulationEngine

router = APIRouter()
engine = SimulationEngine()


class CensorRequest(BaseModel):
    post_ids: list[str] = Field(default_factory=list)


class ParameterUpdateRequest(BaseModel):
    params: SimulationParameters


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/simulation/start")
def start_simulation() -> dict:
    return engine.reset()


@router.post("/simulation/reset")
def reset_simulation() -> dict:
    return engine.reset()


@router.post("/simulation/step")
def step_simulation() -> dict:
    return engine.step()


@router.get("/graph")
def get_graph_state() -> dict:
    return engine.get_graph_state()


@router.get("/feed/{node_id}")
def get_node_feed(node_id: int) -> dict:
    if node_id < 0 or node_id >= engine.params.number_of_nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    return engine.get_feed(node_id)


@router.post("/moderation/censor")
def censor_posts(payload: CensorRequest) -> dict:
    return engine.censor_posts(payload.post_ids)


@router.get("/posts/{post_id}/influence")
def get_post_influence(post_id: str) -> dict:
    return engine.get_post_influence(post_id)


@router.get("/timeseries")
def get_time_series() -> dict:
    return engine.get_time_series()


@router.get("/parameters")
def get_parameters() -> dict:
    return engine.get_parameters()


@router.put("/parameters")
def update_parameters(payload: ParameterUpdateRequest) -> dict:
    return engine.update_parameters(payload.params.model_dump())


@router.get("/status")
def get_status() -> dict:
    return engine.get_status()
