from __future__ import annotations

from app.domain.models import Outcome, TimeSeriesPoint
from app.domain.parameters import SimulationParameters


class GameLogic:
    @staticmethod
    def classify_state(value: float, tolerance: float) -> str:
        if value <= 0.5 - tolerance:
            return "misinformation"
        if value >= 0.5 + tolerance:
            return "fact-checking"
        return "neutral"

    @classmethod
    def percentages(cls, node_states: list[float], tolerance: float) -> dict[str, float]:
        total = len(node_states) or 1
        counts = {"misinformation": 0, "fact-checking": 0, "neutral": 0}
        for state in node_states:
            counts[cls.classify_state(state, tolerance)] += 1
        return {key: value / total for key, value in counts.items()}

    @classmethod
    def time_series_point(cls, step: int, node_states: list[float], tolerance: float) -> TimeSeriesPoint:
        percentages = cls.percentages(node_states, tolerance)
        return TimeSeriesPoint(
            step=step,
            misinformation=percentages["misinformation"],
            fact_checking=percentages["fact-checking"],
            neutral=percentages["neutral"],
        )

    @classmethod
    def evaluate(cls, step: int, node_states: list[float], params: SimulationParameters) -> tuple[Outcome, str]:
        percentages = cls.percentages(node_states, params.neutrality_tolerance)
        if percentages["misinformation"] >= params.win_threshold:
            return Outcome.LOST, "Misinformation reached the loss threshold."
        if percentages["fact-checking"] >= params.win_threshold:
            return Outcome.WON, "Fact-checking reached the win threshold."
        if step >= params.N_steps:
            if percentages["fact-checking"] > percentages["misinformation"]:
                return Outcome.WON, "The moderation window ended with a fact-checking majority."
            return Outcome.LOST, "The moderation window ended without a fact-checking majority."
        return Outcome.RUNNING, "Simulation in progress."
