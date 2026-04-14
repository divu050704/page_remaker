# page_remaker/graph/nodes.py
import json, re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth
from google import genai
import base64
from google.genai import types 

# ──────────────────────────────────────────────────────────────────────
# NODE 1 — Fetch page
# ──────────────────────────────────────────────────────────────────────
def node_fetch_page(state: dict) -> dict:
    url = state["url"]
    try:
        with Stealth().use_sync(sync_playwright()) as p:
            browser = p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            page = context.new_page()
            page.goto(url, wait_until="networkidle", timeout=30_000)
            
            original_html = page.content()
            body_html = page.evaluate("() => document.body.outerHTML")
            browser.close()
        return {"original_html": original_html, "body_html": body_html, "errors": []}
    except Exception as exc:
        return {"errors": [f"fetch_page failed: {exc}"], "original_html": "", "body_html": ""}


# ──────────────────────────────────────────────────────────────────────
# NODE 2 — Suggestor (LLM outputs JSON Schema)
# ──────────────────────────────────────────────────────────────────────
def node_suggest_changes(state: dict, client: genai.Client) -> dict:
    body_html = state.get("body_html", "")
    ad_creative = state.get("ad_creative", "")

    response_schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "action": {"type": "STRING", "enum": ["add", "update", "delete"]},
                "reasoning": {"type": "STRING", "description": "Why this change improves CRO based on the ad."},
                "target_selector": {"type": "STRING", "description": "CSS selector for the element to update or delete."},
                "element": {
                    "type": "OBJECT",
                    "properties": {
                        "html": {"type": "STRING", "description": "Full HTML string to insert or replace"},
                        "text": {"type": "STRING"},
                        "attributes": {"type": "OBJECT", "additionalProperties": {"type": "STRING"}},
                        "styles": {"type": "OBJECT", "additionalProperties": {"type": "STRING"}}
                    }
                },
                "position": {
                    "type": "OBJECT",
                    "description": "Used only for 'add' actions to locate insertion exactly.",
                    "properties": {
                        "parentElement": {"type": "STRING", "description": "CSS selector of the parent container"},
                        "previousElement": {"type": "STRING", "description": "CSS selector of the sibling exactly before this"},
                        "nextElement": {"type": "STRING", "description": "CSS selector of the sibling exactly after this"}
                    }
                }
            },
            "required": ["action", "reasoning"]
        }
    }

    prompt = f"""
    You are an expert CRO AI. Analyze the landing page <body> against the Ad Creative.
    Output ONLY a JSON array of DOM patch operations to optimize the page.
    
    RULES:
    1. For 'update' and 'delete', you MUST provide a valid `target_selector`.
    2. For 'add', you MUST provide the new `element.html` and at least one precise location key in `position` (`previousElement`, `nextElement`, or `parentElement`).
    3. Align existing content with the ad's message, offer, and urgency.
    
    MANDATORY ELEMENTS (You MUST include 'add' operations for ALL of these):
    A. AD BANNER: Inject a high-visibility urgency/offer banner as the very first element inside the <body>.
    B. SOCIAL PROOF: Inject a trust signal element (e.g., "Trusted by 10,000+ users", star ratings, or "As seen on" logos) near the primary Call to Action (CTA).
    C. TESTIMONIALS: Inject a new section containing 2-3 realistic sample testimonials (create fake names and relevant quotes that support the ad's claims). Place this section above the footer or towards the bottom of the content flow.
    
    MANDATORY ELEMENTS (You MUST include 'update' operations for ALL of these):
    A. Make the text content more engaging based on the advert
    B. Make the CTA buttons more engaging according to the advert
    Ensure all added HTML elements include inline styles or use existing framework classes so they do not break the page's design.

    ### AD CREATIVE:
    {ad_creative}

    ### HTML BODY:
    {body_html}
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": response_schema,
            },
        )
        return {"suggested_changes": json.loads(response.text)}
    except Exception as exc:
        return {"errors": [f"suggest_changes failed: {exc}"], "suggested_changes": []}


# ──────────────────────────────────────────────────────────────────────
# NODE 3 — Algorithm (Python applies changes deterministically)
# ──────────────────────────────────────────────────────────────────────
def node_apply_algorithm(state: dict) -> dict:
    original_html = state.get("original_html", "")
    patches = state.get("suggested_changes", [])

    if not original_html or not patches:
        return {"final_html": original_html}

    try:
        soup = BeautifulSoup(original_html, "html.parser")

        for patch in patches:
            action = patch.get("action")
            selector = patch.get("target_selector")
            element = patch.get("element", {})
            position = patch.get("position", {})

            # ── DELETE ────────────────────────────────────────────────
            if action == "delete" and selector:
                target = soup.select_one(selector)
                if target: target.decompose()

            # ── UPDATE ────────────────────────────────────────────────
            elif action == "update" and selector:
                target = soup.select_one(selector)
                if not target: continue
                
                if element.get("text"):
                    target.string = element["text"]
                elif element.get("html"):
                    target.clear()
                    new_nodes = BeautifulSoup(element["html"], "html.parser").contents
                    for node in list(new_nodes):
                        target.append(node)
                
                for attr, val in element.get("attributes", {}).items():
                    target[attr] = val
                    
                if element.get("styles"):
                    style_dict = {k.strip(): v.strip() for k, _, v in (decl.partition(":") for decl in target.get("style", "").split(";") if ":" in decl)}
                    for camel, val in element["styles"].items():
                        style_dict[re.sub(r"([A-Z])", r"-\1", camel).lower()] = val
                    target["style"] = "; ".join(f"{k}: {v}" for k, v in style_dict.items())

            # ── ADD ───────────────────────────────────────────────────
            elif action == "add":
                html_content = element.get("html", "")
                if not html_content: continue
                
                new_soup = BeautifulSoup(html_content, "html.parser")
                new_node = new_soup.find()
                if not new_node: continue

                # Try precise placement logic based on adjacent siblings
                placed = False
                
                if position.get("nextElement"):
                    ref = soup.select_one(position["nextElement"])
                    if ref:
                        ref.insert_before(new_node)
                        placed = True

                if not placed and position.get("previousElement"):
                    ref = soup.select_one(position["previousElement"])
                    if ref:
                        ref.insert_after(new_node)
                        placed = True

                if not placed and position.get("parentElement"):
                    parent = soup.select_one(position["parentElement"])
                    if parent:
                        parent.append(new_node)
                        placed = True
                        
                # Fallback to appending to the body if location fails
                if not placed and soup.body:
                    soup.body.append(new_node)

        return {"final_html": str(soup)}
    except Exception as exc:
        return {"errors": [f"algorithm failed: {exc}"], "final_html": original_html}
    

# ──────────────────────────────────────────────────────────────────────
# NODE 4 — Visual QA (Agent 3 - Critic)
# ──────────────────────────────────────────────────────────────────────
def node_visual_qa(state: dict, client: genai.Client) -> dict:
    final_html = state.get("final_html", "")
    url = state.get("url", "")

    if not final_html:
        return {"errors": ["Visual QA skipped: No final_html available"]}

    try:
        # 1. Render the modified page and take a screenshot
        with Stealth().use_sync(sync_playwright()) as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            page = context.new_page()
            
            # Go to the original URL to load base assets (CSS/JS)
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            
            # Hot-swap the modified HTML into the document
            # Escaping backticks to prevent JS injection errors
            escaped_html = final_html.replace("`", "\\`")
            page.evaluate(f"document.documentElement.innerHTML = `{escaped_html}`;")
            
            # Wait a moment for rendering/paints to settle
            page.wait_for_timeout(2000) 
            
            screenshot_bytes = page.screenshot(full_page=True)
            screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            browser.close()

        # 2. Build the Vision Prompt
        response_schema = {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "action": {"type": "STRING", "enum": ["add", "update", "delete"]},
                    "reasoning": {"type": "STRING", "description": "Why this fixes a layout/design break."},
                    "target_selector": {"type": "STRING"},
                    "element": {
                        "type": "OBJECT",
                        "properties": {
                            "html": {"type": "STRING"},
                            "text": {"type": "STRING"},
                            "attributes": {"type": "OBJECT", "additionalProperties": {"type": "STRING"}},
                            "styles": {"type": "OBJECT", "additionalProperties": {"type": "STRING"}}
                        }
                    },
                    "position": {
                        "type": "OBJECT",
                        "properties": {
                            "parentElement": {"type": "STRING"},
                            "previousElement": {"type": "STRING"},
                            "nextElement": {"type": "STRING"}
                        }
                    }
                },
                "required": ["action", "reasoning"]
            }
        }

        prompt = f"""
        You are an expert Frontend QA Engineer. 
        I have injected CRO modifications into this webpage. 
        Review the provided screenshot and the current HTML.
        
        Identify any breaking changes, visual bugs, overlapping elements, or unstyled blocks that look out of place.
        Output ONLY a JSON array of DOM patch operations to fix these visual errors.
        If the layout looks perfect and no fixes are needed, return an empty array [].
        
        ### CURRENT HTML BODY:
        {BeautifulSoup(final_html, "html.parser").body}
        """

        image_part = types.Part.from_bytes(data=screenshot_bytes, mime_type='image/png')

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[prompt, image_part],
            config={
                "response_mime_type": "application/json",
                "response_schema": response_schema,
            },
        )
        
        return {
            "screenshot_base64": screenshot_base64,
            "correction_patches": json.loads(response.text)
        }
        
    except Exception as exc:
        return {"errors": [f"visual_qa failed: {exc}"], "correction_patches": []}


# ──────────────────────────────────────────────────────────────────────
# NODE 5 — Correction Algorithm (Applies QA fixes)
# ──────────────────────────────────────────────────────────────────────
def node_apply_corrections(state: dict) -> dict:
    current_html = state.get("final_html", "")
    patches = state.get("correction_patches", [])

    if not current_html or not patches:
        return {} # No changes needed

    try:
        soup = BeautifulSoup(current_html, "html.parser")

        for patch in patches:
            action = patch.get("action")
            selector = patch.get("target_selector")
            element = patch.get("element", {})
            position = patch.get("position", {})

            # ── DELETE ────────────────────────────────────────────────
            if action == "delete" and selector:
                target = soup.select_one(selector)
                if target: target.decompose()

            # ── UPDATE ────────────────────────────────────────────────
            elif action == "update" and selector:
                target = soup.select_one(selector)
                if not target: continue
                
                if element.get("text"):
                    target.string = element["text"]
                elif element.get("html"):
                    target.clear()
                    for node in list(BeautifulSoup(element["html"], "html.parser").contents):
                        target.append(node)
                
                for attr, val in element.get("attributes", {}).items():
                    target[attr] = val
                    
                if element.get("styles"):
                    style_dict = {k.strip(): v.strip() for k, _, v in (decl.partition(":") for decl in target.get("style", "").split(";") if ":" in decl)}
                    for camel, val in element["styles"].items():
                        style_dict[re.sub(r"([A-Z])", r"-\1", camel).lower()] = val
                    target["style"] = "; ".join(f"{k}: {v}" for k, v in style_dict.items())

            # ── ADD ───────────────────────────────────────────────────
            elif action == "add":
                html_content = element.get("html", "")
                if not html_content: continue
                
                new_node = BeautifulSoup(html_content, "html.parser").find()
                if not new_node: continue

                placed = False
                if position.get("nextElement"):
                    ref = soup.select_one(position["nextElement"])
                    if ref: ref.insert_before(new_node); placed = True

                if not placed and position.get("previousElement"):
                    ref = soup.select_one(position["previousElement"])
                    if ref: ref.insert_after(new_node); placed = True

                if not placed and position.get("parentElement"):
                    parent = soup.select_one(position["parentElement"])
                    if parent: parent.append(new_node); placed = True
                        
                if not placed and soup.body:
                    soup.body.append(new_node)

        return {"final_html": str(soup)}
    except Exception as exc:
        return {"errors": [f"correction_algorithm failed: {exc}"]}