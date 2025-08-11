def end_node(state):
    print("[DEBUG] Ending node with state:", state)
    return {**state, "output": state.get("output", "")}