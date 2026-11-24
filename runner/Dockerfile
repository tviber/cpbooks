FROM debian:bookworm-slim AS toolchain
RUN apt-get update && apt-get install -y --no-install-recommends clang-14 libclang-14-dev llvm-14-dev python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/lesson
FROM toolchain
COPY instrument.cpp .
RUN clang++-14 -std=c++17 -O1 -I/usr/lib/llvm-14/include instrument.cpp -L/usr/lib/llvm-14/lib -l:libclang-cpp.so.14 -lLLVM-14 -o /usr/local/bin/instrument
COPY lesson.hpp main.cpp worker.py ./
USER 65534:65534
WORKDIR /tmp
ENTRYPOINT ["python3", "-I", "/opt/lesson/worker.py"]
