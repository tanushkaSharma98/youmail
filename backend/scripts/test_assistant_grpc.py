"""
Test assistant gRPC: call ProcessMessage and print action_json or error.
Run with backend running: poetry run python scripts/test_assistant_grpc.py
"""
import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND / ".env")
except ImportError:
    pass

import grpc
from rpc.proto import assistant_pb2, assistant_pb2_grpc


def main() -> None:
    host = "localhost"
    port = 50051
    message = "Send email to john@example.com saying hello"

    channel = grpc.insecure_channel(f"{host}:{port}")
    stub = assistant_pb2_grpc.AssistantServiceStub(channel)
    request = assistant_pb2.AssistantRequest(
        message=message,
        current_view="",
        current_email_id="",
    )

    print(f"Calling ProcessMessage with: {message!r}")
    print("-" * 50)
    try:
        response = stub.ProcessMessage(request)
        action_json = response.action_json
        print("Response (action_json):")
        parsed = json.loads(action_json)
        print(json.dumps(parsed, indent=2))
        if parsed.get("action") == "compose_email":
            print("-" * 50)
            print("OK: Got compose_email action as expected.")
    except grpc.RpcError as e:
        print(f"gRPC error: {e.code()} - {e.details()}")
        if e.code() == grpc.StatusCode.INVALID_ARGUMENT:
            print("(Parsing/validation error from assistant)")
        elif e.code() == grpc.StatusCode.UNAVAILABLE:
            print("(LLM API unavailable or timeout)")
        sys.exit(1)


if __name__ == "__main__":
    main()
