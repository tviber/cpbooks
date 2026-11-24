#pragma once
#include <algorithm>
#include <climits>
#include <cstdio>
#include <cstdlib>
#include <functional>
#include <queue>
#include <utility>
#include <vector>

using Graph = std::vector<std::vector<std::pair<int, int>>>;
void dijkstra(const Graph&, int, std::vector<int>&, std::vector<int>&);

namespace cpbooks {
using Item = std::pair<int, int>;
inline int nodes, events;
inline std::FILE* trace;
inline void emit(const char* kind, int line, int node, int value) {
    if (node < 0 || node >= nodes) { std::fputs("Invalid station index\n", stderr); std::exit(65); }
    if (++events > 2048) { std::fputs("Trace exceeds 2048 events\n", stderr); std::exit(66); }
    std::fprintf(trace, "%s %d %d %d\n", kind, line, node, value);
}

// C++17 evaluates the assignment RHS before the subscript. Both run exactly once.
struct Slot {
    std::vector<int>& array;
    std::size_t index;
    int line;
    const char* kind;
    void operator=(int value) {
        array.at(index) = value;
        emit(kind, line, static_cast<int>(index), value);
    }
};

template<class Q> struct Queue {
    Q& q;
    int line;
    void push(Item item) { q.push(item); emit("queue.push", line, item.second, item.first); }
    void emplace(int distance, int node) {
        q.emplace(distance, node);
        emit("queue.push", line, node, distance);
    }
    const Item& top() {
        const auto& item = q.top();
        emit("queue.top", line, item.second, item.first);
        return item;
    }
    void pop() {
        auto item = q.top();
        q.pop();
        emit("queue.pop", line, item.second, item.first);
    }
};
template<class Q> Queue<Q> observe(Q& q, int line) { return {q, line}; }
}
