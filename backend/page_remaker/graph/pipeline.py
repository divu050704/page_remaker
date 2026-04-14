# page_remaker/graph/pipeline.py
from functools import partial
from langgraph.graph import StateGraph, END
from google import genai

from .state import CROState
from .nodes import (
    node_fetch_page,
    node_suggest_changes,
    node_apply_algorithm,
    node_visual_qa,
    node_apply_corrections,
)

def edge_after_fetch(state: dict) -> str:
    if not state.get("original_html"):
        return END
    return "suggest_changes"

def build_cro_graph(client: genai.Client) -> StateGraph:
    suggest_changes = partial(node_suggest_changes, client=client)
    visual_qa       = partial(node_visual_qa, client=client)

    graph = StateGraph(CROState)
    
    # Register all 5 nodes
    graph.add_node("fetch_page",         node_fetch_page)
    graph.add_node("suggest_changes",    suggest_changes)
    graph.add_node("apply_algorithm",    node_apply_algorithm)
    graph.add_node("visual_qa",          visual_qa)
    graph.add_node("apply_corrections",  node_apply_corrections)

    # Sequence them
    graph.set_entry_point("fetch_page")
    graph.add_conditional_edges("fetch_page", edge_after_fetch, {"suggest_changes": "suggest_changes", END: END})
    graph.add_edge("suggest_changes",    "apply_algorithm")
    graph.add_edge("apply_algorithm",    "visual_qa")
    graph.add_edge("visual_qa",          "apply_corrections")
    graph.add_edge("apply_corrections",  END)

    return graph.compile()

_client = genai.Client(vertexai=True, project='onto-489913', location='global')
cro_pipeline = build_cro_graph(_client)