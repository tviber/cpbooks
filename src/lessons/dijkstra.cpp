using namespace std;

void dijkstra(const Graph& graph, int source, vector<int>& dist, vector<int>& parent) {
    using Item = pair<int, int>;  // (distance, station)
    auto later = [](Item a, Item b) {
        if (a.first != b.first) return a.first > b.first;
        return a.second > b.second;
    };
    priority_queue<Item, vector<Item>, decltype(later)> queue(later);

    dist[source] = 0;
    queue.emplace(0, source);
    while (!queue.empty()) {
        auto [d, u] = queue.top();
        queue.pop();
        if (d != dist[u]) continue;
        for (auto [v, w] : graph[u]) {
            if (d + w < dist[v]) {
                dist[v] = d + w;
                parent[v] = u;
                queue.push({dist[v], v});
            }
        }
    }
}
