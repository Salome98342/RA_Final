from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Expose all API endpoints under the "/api" prefix by delegating to the api app's URLs.
# This avoids relative imports from the project module and matches the frontend/tests base URL.
urlpatterns = [
    # Django admin site
    path("admin/", admin.site.urls),
    path("api/", include("api.urls.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)