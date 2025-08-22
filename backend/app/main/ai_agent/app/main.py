import asyncio
from app.ai_agent.app.graph import run_agent

async def cli():
    while True:
        user_input = input("🧑 Bạn: ")
        if user_input.lower() in {"exit", "quit"}:
            break
        try:
            result = await run_agent(user_input)  # <- phải await
        except Exception as e:
            print("🤖 Bot: Không thể xử lý yêu cầu:", e)
            continue
        print("🤖 Bot:", result)

if __name__ == "__main__":
    asyncio.run(cli())