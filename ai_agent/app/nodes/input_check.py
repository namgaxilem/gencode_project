from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
import json
from dotenv import load_dotenv

load_dotenv()

# Initialize LLM (sử dụng GPT-4o, key lấy từ ENV OPENAI_API_KEY)
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0,
    max_tokens=500,
    max_retries=2
)

def input_check_node(state):
    user_input = state["input"]
    print("[DEBUG] User input:", user_input)

    system_prompt = """
Bạn là một AI trợ lý chuyên phân tích yêu cầu lập trình frontend. 
Hãy đọc mô tả và trả về JSON với format:

{
  "framework": "react" | "next" | "vue" | "svelte" | "unknown" | "none",
  "action": "generate" | "ask_framework" | "exit"
}

Chỉ trả về JSON, không bao Markdown (```).
"""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_input)
        ])

        print("[DEBUG] Raw LLM output:", response.content)

        result = json.loads(response.content)

        return {
            "action": result.get("action", "exit"),
            "framework": result.get("framework", "")
        }

    except Exception as e:
        print("[ERROR] input_check_node failed:", e)
        return {
            "action": "exit",
            "framework": ""
        }