from __future__ import annotations

from app.domain.category_config import CATEGORY_ALPHA, CATEGORY_BETA, CATEGORY_GAMMA
from app.domain.models import Outcome, TimeSeriesPoint
from app.domain.parameters import SimulationParameters


class GameLogic:
    @staticmethod
    def classify_state(value: float, tolerance: float) -> str:
        if value <= 0.5 - tolerance:
            return CATEGORY_GAMMA.key
        if value >= 0.5 + tolerance:
            return CATEGORY_ALPHA.key
        return CATEGORY_BETA.key

    @classmethod
    def percentages(cls, node_states: list[float], tolerance: float) -> dict[str, float]:
        total = len(node_states) or 1
        counts = {CATEGORY_ALPHA.key: 0, CATEGORY_BETA.key: 0, CATEGORY_GAMMA.key: 0}
        for state in node_states:
            counts[cls.classify_state(state, tolerance)] += 1
        return {key: value / total for key, value in counts.items()}

    @classmethod
    def time_series_point(cls, step: int, node_states: list[float], tolerance: float) -> TimeSeriesPoint:
        percentages = cls.percentages(node_states, tolerance)
        return TimeSeriesPoint(
            step=step,
            alpha=percentages[CATEGORY_ALPHA.key],
            beta=percentages[CATEGORY_BETA.key],
            gamma=percentages[CATEGORY_GAMMA.key],
        )

    @classmethod
    def evaluate(cls, step: int, node_states: list[float], params: SimulationParameters) -> tuple[Outcome, str]:
        percentages = cls.percentages(node_states, params.center_tolerance)
        alpha_value = percentages[CATEGORY_ALPHA.key]
        gamma_value = percentages[CATEGORY_GAMMA.key]

        # Super-majority can end the game immediately, even before bulldozers arrive.
        if alpha_value >= params.win_threshold:
            return Outcome.WON, f"{CATEGORY_ALPHA.label} reached the super-majority threshold."
        if gamma_value >= params.win_threshold:
            return Outcome.LOST, f"{CATEGORY_GAMMA.label} reached the super-majority threshold."

        if step >= params.election_step:
            alpha_super_majority = alpha_value >= params.win_threshold
            gamma_super_majority = gamma_value >= params.win_threshold
            alpha_majority = alpha_value > gamma_value

            if alpha_super_majority:
                return Outcome.WON, f"Election day: {CATEGORY_ALPHA.label} reached a super-majority."
            if alpha_majority:
                return Outcome.WON, f"Election day: {CATEGORY_ALPHA.label} won the majority vote."
            if gamma_super_majority:
                return Outcome.LOST, f"Election day: {CATEGORY_GAMMA.label} reached a super-majority."
            return Outcome.LOST, f"Election day: {CATEGORY_ALPHA.label} did not secure the majority."

        steps_left = max(0, params.election_step - step)
        return Outcome.RUNNING, f"Campaign in progress. {steps_left} day(s) until bulldozers arrive."
