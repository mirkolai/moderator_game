from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CategoryDefinition:
    key: str
    label: str
    posts_csv: str


# Ordered by opinion space: low -> center -> high.
CATEGORY_GAMMA = CategoryDefinition(key="gamma", label="Tamed", posts_csv="gamma_posts.csv")
CATEGORY_BETA = CategoryDefinition(key="beta", label="Undecided", posts_csv="beta_posts.csv")
CATEGORY_ALPHA = CategoryDefinition(key="alpha", label="Uncaged", posts_csv="apha_posts.csv")

CATEGORY_BY_KEY: dict[str, CategoryDefinition] = {
    CATEGORY_ALPHA.key: CATEGORY_ALPHA,
    CATEGORY_BETA.key: CATEGORY_BETA,
    CATEGORY_GAMMA.key: CATEGORY_GAMMA,
}
