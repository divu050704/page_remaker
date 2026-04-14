# page_remaker/graph/state.py
from typing import TypedDict, Annotated
import operator

class CROState(TypedDict):
    url:               str
    ad_creative:       str

    original_html:     str
    body_html:         str
    final_html:        str

    # Pass 1: Initial CRO optimization
    suggested_changes: list  

    # Pass 2: Visual QA & Correction
    screenshot_base64: str
    correction_patches: list

    errors: Annotated[list, operator.add]