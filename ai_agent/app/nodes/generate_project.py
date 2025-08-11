import asyncio
from ai_agent.app.templates.react_template import generate_react_project
from ai_agent.app.templates.vue_template import generate_vue_project
from ai_agent.app.templates.svelte_template import generate_svelte_project

async def generate_project_node(state):
    print("[DEBUG] Generating project with state:", state)
    framework = state.get("framework", "").lower()
    
    if framework == "react":
        print("[DEBUG] Generating React project")
        output = await generate_react_project(state["input"])
        return {**state, "output": output}
    elif framework == "next":
        print("[DEBUG] Generating Next.js project")
        return {**state, "output": "Next.js project created!"}
    elif framework == "vue":
        print("[DEBUG] Generating Vue project")
        output = await generate_vue_project(state["input"])
        return {**state, "output": output}
    elif framework == "svelte":
        print("[DEBUG] Generating Svelte project")
        output = await generate_svelte_project(state["input"])
        return {**state, "output": output}
    else:
        return {**state, "output": "Framework không hợp lệ."}
