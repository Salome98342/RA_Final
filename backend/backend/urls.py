from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# Expose all API endpoints under the "/api" prefix by delegating to the api app's URLs.
# This avoids relative imports from the project module and matches the frontend/tests base URL.
urlpatterns = [
    # Django admin site
    path("admin/", admin.site.urls),
    path("api/", include("api.urls.urls")),
    
    # ==================== DOCUMENTACIÓN API ====================
    # OpenAPI schema (JSON/YAML)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    
    # Swagger UI (interfaz interactiva)
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    
    # ReDoc UI (documentación alternativa)
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Servir plantillas CSV en desarrollo
    urlpatterns += [
        re_path(r'^plantillas/(?P<path>.*)$', serve, {
            'document_root': settings.BASE_DIR / 'plantillas',
        }),
    ]