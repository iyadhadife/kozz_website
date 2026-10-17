import os

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph

SYSTEM_PROMPT = "Tu es l'assistant du site Kozz. Réponds de façon concise et utile."

llm = ChatAnthropic(model=os.getenv("CHATBOT_MODEL", "claude-sonnet-5-5"))


def chatbot(state: MessagesState):
    reply = llm.invoke([SystemMessage(SYSTEM_PROMPT), *state["messages"]])
    return {"messages": [reply]}


builder = StateGraph(MessagesState)
builder.add_node("chatbot", chatbot)
builder.add_edge(START, "chatbot")
builder.add_edge("chatbot", END)

# MemorySaver : mémoire de conversation par thread_id (remplacer par Postgres/Redis en prod)
graph = builder.compile(checkpointer=MemorySaver())
