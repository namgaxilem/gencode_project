# app/graph.py

from typing import TypedDict
from langgraph.graph import StateGraph
from app.ai_agent.app.nodes.input_check import input_check_node
from app.ai_agent.app.nodes.confirm_framework import confirm_framework_node
from app.ai_agent.app.nodes.generate_project import generate_project_node
from app.ai_agent.app.nodes.end_node import end_node

class AgentState(TypedDict):
    input: str
    action: str
    framework: str
    output: str

def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("check_input", input_check_node)
    builder.add_node("ask_framework", confirm_framework_node)
    builder.add_node("generate", generate_project_node)
    builder.add_node("end", end_node)

    builder.set_entry_point("check_input")

    builder.add_conditional_edges(
        "check_input",
        lambda state: state["action"],
        {
            "generate": "generate",
            "ask_framework": "ask_framework",
            "exit": "end"
        }
    )

    builder.add_edge("ask_framework", "end")
    builder.add_edge("generate", "end")

    return builder.compile()

graph = build_graph()

async def run_agent(user_input: str) -> str:
    result = await graph.ainvoke({"input": user_input})
    print("[DEBUG] Final state:", result)
    return result.get("output", "Không có đầu ra.")
