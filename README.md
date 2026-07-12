## [Live Link](https://converge.progardenindia.com/)
## 1. Introduction

Development of a framework that can:
- Take the advert image/caption text and the landing page as an input
- Update the page to have CRO principles and personalised as per the advert
- Show a preview to the user, with the changes made and the reasoning behind them.
**Technology Used:**
- Backend- Django, LangGraph, Vertex AI(GCP), PlaywrightStealth, BeautifulSoup
- Fronted: ReactJS, Vite, TailwindCSS
- Deployment: Git, Docker, NGINX, Hostinger VPS


## 2. Methodology

The framework works on the methodology of capture, suggest and apply changes, visual
QA, and apply corrections. Each step is explained below.

### 2.1. Capture

The HTML content of the page is captured using Playwright Stealth to prevent the anti-bot
system from intercepting the request and returning an access denied response.
Sending the entire HTML file, which may include JS scripts and CSS, can result in token
wastage; to prevent this, only the body tag is retrieved, and the original HTML is stored
separately so it can be used later for page rendering.

### 2.2. Suggest and Apply Changes

The body is sent to the Gemini-2.5-flash model to create a JSON output, which provides the
details on three aspects: addition, updation, and deletion. For each aspect, the LLM provides
3 things: Parent Element, Previous Element, and Next Element. Generating the whole page
wastes the token unnecessarily and can also increase the chances of hallucination. This
provides the updation algorithm a helping hand in locating the exact place where the
elements need to be changed in the DOM tree.

### 2.3. Visual QA and apply corrections

An agent is utilised to verify if the generated code is correct or not. The agent is provided
with the screenshot of the newly created page (using Playwright) and the HTML code. The
LLM provides witht the changes for code breaks, like overlaps, colorscheme mismatch, and
alignment issues, which are again updated using the algorithm.

## 3. Key Challenges

The main issues faced during development and testing, with their solutions, are given below:

### 3.1. Hallucinations

The first version of the framework generated an output HTML file directly from the LLM,
which led to the creation of completely new sections and the deletion of the core identity of
the company.
To correct this, the LLM was asked only for suggestions and the elements which needs to
changed, and then it was changed in the DOM tree using the algorithm. This not only
reduced the chances of hallucinations, but also reduced the chances of token wastage in the
output.


### 3.2. Broken UI

The newly edited pages are reviewed by the LLM to look for inconsistencies like overlaps,
colour scheme mismatch, and alignment issues, which are again updated using the
algorithm.

### 3.3. Inconsistent Changes

The system prompt for the suggestor agent is provided with the exact changes to make,
rather than providing generalised instructions to implement advert-related changes and CRO
enhancement. The prompt also specifies the exact sections and CTA elements to look for
changes, which drastically reduced the inconsistent changes.

<img width="1150" height="2840" alt="mermaid-diagram-2026-04-14T14-48-17" src="https://github.com/user-attachments/assets/65fc8955-77e3-44f9-9c74-92a32c533633" />
