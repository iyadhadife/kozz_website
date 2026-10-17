from fastapi import FastAPI
from pydantic import BaseModel

from .graph import graph

app = FastAPI(title="Kozz Chatbot")


class ChatIn(BaseModel):
    message: str
    thread_id: str = "default"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/message")
def message(body: ChatIn):
    result = graph.invoke(
        {"messages": [("user", body.message)]},
        config={"configurable": {"thread_id": body.thread_id}},
    )
    return {"reply": result["messages"][-1].content}
