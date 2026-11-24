#include "lesson.hpp"

int main() {
    int n, m, source;
    if (std::scanf("%d%d%d", &n, &m, &source) != 3) return 1;
    Graph graph(n);
    for (int i = 0; i < m; ++i) {
        int u, v, w;
        if (std::scanf("%d%d%d", &u, &v, &w) != 3) return 1;
        graph.at(u).emplace_back(v, w);
        graph.at(v).emplace_back(u, w);
    }
    std::vector<int> dist(n, INT_MAX), parent(n, -1);
    cpbooks::nodes = n;
    cpbooks::trace = std::fopen("events", "w");
    if (!cpbooks::trace) return 1;
    dijkstra(graph, source, dist, parent);
    for (int i = 0; i < n; ++i)
        std::fprintf(cpbooks::trace, "result %d %d %d\n", i, dist.at(i), parent.at(i));
    return std::fclose(cpbooks::trace) != 0;
}
