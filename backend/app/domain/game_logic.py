from __future__ import annotations

from app.domain.models import Outcome, TimeSeriesPoint
from app.domain.parameters import SimulationParameters


class GameLogic:
    @staticmethod
    def classify_state(value: float, tolerance: float) -> str:
        if value <= 0.5 - tolerance:
            return "dictatorship"
        if value >= 0.5 + tolerance:
            return "democracy"
        return "neutral"

    @classmethod
    def percentages(cls, node_states: list[float], tolerance: float) -> dict[str, float]:
        total = len(node_states) or 1
        counts = {"dictatorship": 0, "democracy": 0, "neutral": 0}
        for state in node_states:
            counts[cls.classify_state(state, tolerance)] += 1
        return {key: value / total for key, value in counts.items()}

    @classmethod
    def time_series_point(cls, step: int, node_states: list[float], tolerance: float) -> TimeSeriesPoint:
        percentages = cls.percentages(node_states, tolerance)
        return TimeSeriesPoint(
            step=step,
            dictatorship=percentages["dictatorship"],
            democracy=percentages["democracy"],
            neutral=percentages["neutral"],
        )

    @classmethod
    def evaluate(cls, step: int, node_states: list[float], params: SimulationParameters) -> tuple[Outcome, str]:
        percentages = cls.percentages(node_states, params.neutrality_tolerance)
        democracy = percentages["democracy"]
        dictatorship = percentages["dictatorship"]

        # Super-majority can end the game immediately, even before election day.
        if democracy >= params.win_threshold:
            return Outcome.WON, "Democracy reached the super-majority threshold."
        if dictatorship >= params.win_threshold:
            return Outcome.LOST, "Dictatorship reached the super-majority threshold."

        if step >= params.election_step:
            democracy_super_majority = democracy >= params.win_threshold
            dictatorship_super_majority = dictatorship >= params.win_threshold
            democracy_majority = democracy > dictatorship
            dictatorship_majority = dictatorship > democracy

            if democracy_super_majority:
                return Outcome.WON, "Election day: democracy reached a super-majority."
            if democracy_majority:
                return Outcome.WON, "Election day: democracy won the majority vote."
            if dictatorship_super_majority:
                return Outcome.LOST, "Election day: dictatorship reached a super-majority."
            return Outcome.LOST, "Election day: democracy did not secure the majority."

        steps_left = max(0, params.election_step - step)
        return Outcome.RUNNING, f"Campaign in progress. {steps_left} day(s) until election."
