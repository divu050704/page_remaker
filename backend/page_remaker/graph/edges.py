# page_remaker/graph/edges.py


def edge_after_fetch(state: dict) -> str:
    """Abort early if page fetch failed."""
    if not state.get("original_html"):
        return "end"
    return "extract_design"


def edge_after_structural_validate(state: dict) -> str:
    """
    If too many suggestions failed AND we haven't exceeded max_retries,
    route to the retry node to regenerate broken suggestions.
    Otherwise proceed to semantic validation.
    """
    results     = state.get("structural_results", [])
    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 1)

    if not results:
        return "semantic_validate"

    fail_count  = sum(1 for r in results if r["status"] == "fail")
    fail_rate   = fail_count / len(results)

    # Retry if >40% of suggestions failed and we still have retries left
    if fail_rate > 0.4 and retry_count < max_retries:
        return "retry_suggestions"

    return "semantic_validate"


def edge_after_semantic_validate(state: dict) -> str:
    return "end"