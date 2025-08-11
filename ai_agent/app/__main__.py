# app/__main__.py

from graph import run_agent

if __name__ == "__main__":
    while True:
        user_input = input("🧑 Bạn: ")
        if user_input.lower() in {"exit", "quit"}:
            break
        result = run_agent(user_input)
        print("🤖 Bot:", result)
