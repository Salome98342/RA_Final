from django.core.management.base import BaseCommand
from django.urls import get_resolver, URLPattern, URLResolver

def flatten(patterns, prefix=""):
    for p in patterns:
        if isinstance(p, URLResolver):
            new_prefix = prefix + str(p.pattern)
            yield from flatten(p.url_patterns, new_prefix)
        elif isinstance(p, URLPattern):
            path = (prefix + str(p.pattern)).replace("^", "").replace("$", "")
            name = p.name or ""
            cb = p.callback
            view = f"{cb.__module__}.{getattr(cb, '__name__', cb.__class__.__name__)}"
            yield (path, name, view)

class Command(BaseCommand):
    help = "Lista todas las URLs registradas"

    def handle(self, *args, **options):
        resolver = get_resolver()
        rows = list(flatten(resolver.url_patterns))
        rows.sort(key=lambda r: r[0])
        for path, name, view in rows:
            self.stdout.write(f"{path}\t{name}\t{view}")