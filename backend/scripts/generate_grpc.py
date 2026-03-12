"""Generate Python gRPC code from proto. Run from backend: poetry run python scripts/generate_grpc.py"""
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
PROTO_FILES = [
    "rpc/proto/mail.proto",
    "rpc/proto/assistant.proto",
]


def main() -> None:
    for proto_rel in PROTO_FILES:
        proto_file = BACKEND / proto_rel
        if not proto_file.exists():
            print("Proto file not found:", proto_file)
            sys.exit(1)
        cmd = [
            sys.executable,
            "-m",
            "grpc_tools.protoc",
            f"-I{BACKEND}",
            f"--python_out={BACKEND}",
            f"--grpc_python_out={BACKEND}",
            proto_rel,
        ]
        subprocess.run(cmd, cwd=BACKEND, check=True)
    out_dir = BACKEND / "rpc" / "proto"
    for name in (
        "mail_pb2.py",
        "mail_pb2_grpc.py",
        "assistant_pb2.py",
        "assistant_pb2_grpc.py",
    ):
        path = out_dir / name
        if path.exists():
            print("Generated", path)


if __name__ == "__main__":
    main()
