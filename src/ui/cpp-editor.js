import starter from '../lessons/dijkstra.cpp?raw';

export function mountEditor() {
  const form = document.createElement('form');
  form.className = 'cpp-editor';
  form.id = 'cpp-form';
  form.method = 'post';
  form.action = '/api/execute';
  form.innerHTML = `<label for="cpp-source">Dijkstra 函数</label>
    <p id="cpp-contract">Graph 是邻接表，每项为 (邻站, 用时)。距离和前驱已分别初始化为 INT_MAX 和 -1。队列元素为 (距离, 站点编号)。</p>
    <textarea id="cpp-source" name="code" rows="19" required maxlength="16384" wrap="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-describedby="cpp-contract"></textarea>
    <button class="primary" type="submit">在本机编译并运行</button><pre id="cpp-diagnostic" role="status"></pre>`;
  const field = form.elements.code;
  field.value = starter;
  try { field.value = localStorage.getItem('dijkstra.cpp.v1') ?? starter; } catch { /* Optional local draft. */ }
  field.addEventListener('input', () => {
    try { localStorage.setItem('dijkstra.cpp.v1', field.value); } catch { /* Optional local draft. */ }
  });
  document.getElementById('code-pane').prepend(form);
  return { form, field, diagnostic: form.querySelector('pre'), submit: form.querySelector('button') };
}
