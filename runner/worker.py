"""One disposable container and one compilation per request, a fresh process per graph."""
import json
import resource
import signal
import subprocess
import sys
import tempfile
from pathlib import Path


class Failure(Exception):
    def __init__(self, phase, message):
        self.phase = phase
        super().__init__(message)


def limits():
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_FSIZE, (4 << 20, 4 << 20))


def invoke(args, phase, seconds, data=b'', output=None):
    with tempfile.TemporaryFile() as log:
        try:
            proc = subprocess.run(args, input=data, stdout=output or log, stderr=log,
                                  timeout=seconds, preexec_fn=limits)
        except subprocess.TimeoutExpired:
            raise Failure('timeout', f'{phase} exceeded {seconds}s')
        if proc.returncode:
            log.seek(0)
            message = log.read(4096).decode(errors='replace').strip()
            if 'unsupported:' in message:
                phase = 'unsupported'
            status = signal.strsignal(-proc.returncode) if proc.returncode < 0 else f'exit {proc.returncode}'
            raise Failure(phase, message or f'{args[0]}: {status}')


def run_case(case, source_lines):
    n, edges = case['n'], case['edges']
    data = [f"{n} {len(edges)} {case['source']}", *(' '.join(map(str, e)) for e in edges)]
    Path('events').unlink(missing_ok=True)
    invoke(['./student'], 'runtime', 2, ('\n'.join(data) + '\n').encode())
    dist, parent = [], []
    events = []
    observed_dist, observed_parent = [2147483647] * n, [-1] * n
    try:
        with open('events') as trace:
            for record in trace:
                kind, *fields = record.split()
                a, b, c = map(int, fields)
                if kind == 'result' and a == len(dist) < n:
                    dist.append(b)
                    parent.append(c)
                    continue
                if (dist or not 1 <= a <= source_lines or not 0 <= b < n or len(events) >= 2048
                        or kind not in ('queue.push', 'queue.pop', 'queue.top', 'distance.write', 'parent.write')):
                    raise ValueError()
                if kind == 'distance.write':
                    observed_dist[b] = c
                if kind == 'parent.write':
                    observed_parent[b] = c
                events.append(dict(kind=kind, line=a, node=b, value=c))
    except (OSError, ValueError):
        raise Failure('runtime', 'Incomplete or invalid execution record')
    if len(dist) != n:
        raise Failure('runtime', 'Function did not return a complete result')
    if (dist, parent) != (observed_dist, observed_parent):
        raise Failure('unsupported', 'A result changed outside an instrumented assignment')
    return dict(events=events, result=dict(distance=dist, parent=parent))


def work(job):
    source = job['code']
    Path('student.cpp').write_text(source)
    with open('instrumented.cpp', 'wb') as out:
        invoke(['instrument'], 'compile', 10, output=out)
    invoke(['clang++-14', '-std=c++17', '-D_GLIBCXX_ASSERTIONS', '-fsanitize=undefined',
            '-fsanitize-undefined-trap-on-error', '-include', '/opt/lesson/lesson.hpp',
            'instrumented.cpp', '/opt/lesson/main.cpp', '-o', 'student'], 'compile', 15)
    runs = []
    for case in job['cases']:
        try:
            run = run_case(case, source.count('\n') + 1)
        except Failure as exc:
            raise Failure(exc.phase, f"{case['name']}: {exc}")
        if runs:
            del run['events']
        runs.append(run)
    return dict(runs=runs)


try:
    print(json.dumps(work(json.load(sys.stdin))))
except Failure as error:
    print(json.dumps(dict(error=dict(phase=error.phase, message=str(error)))))
